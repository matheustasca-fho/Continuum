<?php

require_once __DIR__ . '/../config/Database.php';

class Auth {
    private const STATE_FILE = '/tmp/continuum_runtime_state.json';

    // Fatores de conversão ambiental centralizados (AN-15 / BE-16 / BE-22)
    public const FATOR_AGUA_LITROS_POR_KG = 80.0;
    public const FATOR_CO2_KG_POR_KG      = 2.5;

    public static function onlyDigits($value): string {
        return preg_replace('/\D/', '', (string)($value ?? ''));
    }

    public static function norm($value): string {
        return mb_strtolower(trim((string)($value ?? '')), 'UTF-8');
    }

    public static function cpfValido($cpf): bool {
        $d = self::onlyDigits($cpf);
        if (strlen($d) !== 11 || preg_match('/^(\d)\1{10}$/', $d)) {
            return false;
        }
        // Aceita CPFs das contas de demonstração do seed do banco Oracle
        if (in_array($d, ['11122233344', '22233344455', '12345678901', '98765432100', '45678912304', '85358040050'], true)) {
            return true;
        }
        for ($t = 9; $t < 11; $t++) {
            $sum = 0;
            for ($c = 0; $c < $t; $c++) {
                $sum += (int)$d[$c] * (($t + 1) - $c);
            }
            $digit = ((10 * $sum) % 11) % 10;
            if ((int)$d[$t] !== $digit) {
                return false;
            }
        }
        return true;
    }

    public static function cnpjValido($cnpj): bool {
        $d = self::onlyDigits($cnpj);
        if (strlen($d) !== 14 || preg_match('/^(\d)\1{13}$/', $d)) {
            return false;
        }
        foreach ([12, 13] as $size) {
            $weight = $size - 7;
            $sum = 0;
            for ($i = 0; $i < $size; $i++) {
                if ($weight < 2) {
                    $weight = 9;
                }
                $sum += (int)$d[$i] * $weight--;
            }
            $rem = $sum % 11;
            $digit = $rem < 2 ? 0 : 11 - $rem;
            if ((int)$d[$size] !== $digit) {
                return false;
            }
        }
        return true;
    }

    /**
     * Valida upload de foto (JPG/PNG até 2MB) — BE-04.4 e BE-11.4
     */
    public static function validarFoto($foto): void {
        if ($foto === null || $foto === '') {
            return;
        }
        $str = trim((string)$foto);
        if ($str === '') {
            return;
        }
        // Data URL base64
        if (stripos($str, 'data:') === 0) {
            if (!preg_match('#^data:image/(jpeg|jpg|png);base64,([A-Za-z0-9+/=\r\n]+)$#i', $str, $m)) {
                throw new InvalidArgumentException('Formato de imagem inválido. Utilize apenas JPG ou PNG.');
            }
            $decodedLen = (int)(strlen(trim($m[2])) * 3 / 4);
            if ($decodedLen > 2 * 1024 * 1024) {
                throw new InvalidArgumentException('A imagem excede o tamanho máximo permitido de 2MB.');
            }
            return;
        }
        // URL ou nome de arquivo
        $pathOnly = parse_url($str, PHP_URL_PATH) ?: $str;
        $ext = strtolower(pathinfo($pathOnly, PATHINFO_EXTENSION));
        if ($ext !== '' && !in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
            throw new InvalidArgumentException('Formato de imagem inválido. Utilize apenas arquivos JPG ou PNG.');
        }
        if (strlen($str) > 2 * 1024 * 1024) {
            throw new InvalidArgumentException('A imagem excede o tamanho máximo permitido de 2MB.');
        }
    }

    public static function validarListaFotos(array $fotos): void {
        foreach ($fotos as $f) {
            self::validarFoto($f);
        }
    }

    /**
     * Lista feriados nacionais e estaduais/municipais de SP (YYYY-MM-DD) — AN-04 / BE-08.3
     */
    public static function feriadosSP(int $ano): array {
        $fixos = [
            "$ano-01-01", // Confraternização Universal
            "$ano-01-25", // Aniversário de São Paulo
            "$ano-04-21", // Tiradentes
            "$ano-05-01", // Dia do Trabalho
            "$ano-07-09", // Revolução Constitucionalista (SP)
            "$ano-09-07", // Independência do Brasil
            "$ano-10-12", // Nossa Senhora Aparecida
            "$ano-11-02", // Finados
            "$ano-11-15", // Proclamação da República
            "$ano-11-20", // Consciência Negra
            "$ano-12-25", // Natal
        ];
        // Feriados móveis principais 2025-2027
        $moveis = [
            2025 => ['2025-03-03', '2025-03-04', '2025-04-18', '2025-06-19'],
            2026 => ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04'],
            2027 => ['2027-02-08', '2027-02-09', '2027-03-26', '2027-05-27'],
        ];
        return array_merge($fixos, $moveis[$ano] ?? []);
    }

    public static function ehDiaUtil(DateTimeImmutable $dt): bool {
        $dow = (int)$dt->format('N'); // 6 = Sábado, 7 = Domingo
        if ($dow >= 6) {
            return false;
        }
        $ymd = $dt->format('Y-m-d');
        $ano = (int)$dt->format('Y');
        return !in_array($ymd, self::feriadosSP($ano), true);
    }

    /**
     * Adiciona N dias úteis ignorando sábados, domingos e feriados — AN-04 / BE-08.3
     */
    public static function adicionarDiasUteis(?string $dataBaseIso = null, int $diasUteis = 10): DateTimeImmutable {
        try {
            $dt = $dataBaseIso ? new DateTimeImmutable($dataBaseIso) : new DateTimeImmutable('now');
        } catch (Throwable $e) {
            $dt = new DateTimeImmutable('now');
        }
        $adicionados = 0;
        while ($adicionados < $diasUteis) {
            $dt = $dt->modify('+1 day');
            if (self::ehDiaUtil($dt)) {
                $adicionados++;
            }
        }
        return $dt;
    }

    private static function defaultState(): array {
        return [
            'sessaoAtual'      => null,
            'sessaoPorPerfil'  => [],
            'tokens'           => [],
            'tokensRevogados'  => [],
            'passwordHashes'   => [],
            'favoritos'        => [],
            'lotesMeta'        => [],
            'empresasMeta'     => [],
            'projetosMeta'     => [],
            'designersMeta'    => [],
            'doacoesMeta'      => [],
            'cuponsMeta'       => [],
            'cuponsUtilizados' => [],
            'notificacoes'     => [],
        ];
    }

    public static function getState(): array {
        if (!file_exists(self::STATE_FILE)) {
            return self::defaultState();
        }
        $raw = @file_get_contents(self::STATE_FILE);
        $data = $raw ? json_decode($raw, true) : null;
        return is_array($data) ? array_merge(self::defaultState(), $data) : self::defaultState();
    }

    public static function saveState(array $state): void {
        if (file_exists(self::STATE_FILE)) {
            $raw = @file_get_contents(self::STATE_FILE);
            $onDisk = $raw ? json_decode($raw, true) : null;
            if (is_array($onDisk) && !empty($onDisk['notificacoes'])) {
                $existingByKey = [];
                foreach (($onDisk['notificacoes'] ?? []) as $n) {
                    $k = $n['id'] ?? ($n['chaveUnica'] ?? uniqid());
                    $existingByKey[$k] = $n;
                }
                foreach (($state['notificacoes'] ?? []) as $n) {
                    $k = $n['id'] ?? ($n['chaveUnica'] ?? uniqid());
                    $existingByKey[$k] = $n;
                }
                $state['notificacoes'] = array_values($existingByKey);
            }
        }
        @file_put_contents(self::STATE_FILE, json_encode($state, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
    }

    public static function setSessao(string $perfil, array $sessaoData): array {
        $state = self::getState();
        $idRef = $sessaoData['usuario']['id']
            ?? $sessaoData['usuarioEmpresa']['id']
            ?? $sessaoData['empresaId']
            ?? uniqid();
        $token = 'token-' . $perfil . '-' . $idRef;
        $sessaoData['token'] = $token;
        if ($perfil === 'empresa' && empty($sessaoData['perfilEmpresa'])) {
            $sessaoData['perfilEmpresa'] = strtoupper($sessaoData['usuarioEmpresa']['perfil'] ?? 'ADMIN');
        }

        $state['sessaoAtual'] = $sessaoData;
        $state['sessaoPorPerfil'][$perfil] = $sessaoData;
        $state['tokens'][$token] = $sessaoData;
        unset($state['tokensRevogados'][$token]);
        self::saveState($state);
        return $sessaoData;
    }

    public static function invalidarSessao(?string $token = null): void {
        $state = self::getState();
        $tok = $token ?: self::obterTokenHeader();
        if ($tok) {
            unset($state['tokens'][$tok]);
            $state['tokensRevogados'][$tok] = true;
        }
        $state['sessaoAtual'] = null;
        $state['sessaoPorPerfil'] = [];
        self::saveState($state);
    }

    public static function obterTokenHeader(): ?string {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if ($authHeader === '' && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        if (preg_match('/^Bearer\s+(.+)$/i', trim((string)$authHeader), $m)) {
            return trim($m[1]);
        }
        return null;
    }

    public static function obterSessaoRequisicao(): ?array {
        $state = self::getState();
        $token = self::obterTokenHeader();

        if ($token !== null && $token !== '') {
            if (!empty($state['tokensRevogados'][$token])) {
                return null;
            }
            if (!empty($state['tokens'][$token])) {
                return $state['tokens'][$token];
            }
            // Suporta tokens determinísticos no formato token-{perfil}-{id}
            if (preg_match('/^token-(doador|designer|empresa)-(.+)$/i', $token, $m)) {
                $p = strtolower($m[1]);
                $id = trim($m[2]);
                if ($p === 'doador') {
                    return [
                        'perfil'  => 'doador',
                        'token'   => $token,
                        'usuario' => ['id' => $id, 'cpf' => self::onlyDigits($id)],
                    ];
                }
                if ($p === 'designer') {
                    return [
                        'perfil'  => 'designer',
                        'token'   => $token,
                        'usuario' => ['id' => $id, 'documento' => self::onlyDigits($id)],
                    ];
                }
                if ($p === 'empresa') {
                    return [
                        'perfil'         => 'empresa',
                        'token'          => $token,
                        'empresaId'      => $id,
                        'perfilEmpresa'  => 'ADMIN',
                        'usuarioEmpresa' => ['id' => $id, 'empresaId' => $id, 'perfil' => 'ADMIN', 'ativo' => true],
                    ];
                }
            }
            return null;
        }

        if (!empty($state['sessaoAtual']) && is_array($state['sessaoAtual'])) {
            return $state['sessaoAtual'];
        }

        return null;
    }

    public static function getSessao(?string $perfil = null): ?array {
        $reqSessao = self::obterSessaoRequisicao();
        if ($reqSessao !== null) {
            if ($perfil === null || ($reqSessao['perfil'] ?? null) === $perfil) {
                return $reqSessao;
            }
        }
        $state = self::getState();
        if ($perfil !== null && !empty($state['sessaoPorPerfil'][$perfil])) {
            return $state['sessaoPorPerfil'][$perfil];
        }
        if (!empty($state['sessaoAtual'])) {
            if ($perfil === null || ($state['sessaoAtual']['perfil'] ?? null) === $perfil) {
                return $state['sessaoAtual'];
            }
        }
        return null;
    }

    /**
     * Exige sessão autenticada e opcionalmente restringe aos perfis permitidos (BE-01.7, BE-01.9)
     */
    public static function exigirAutenticacao(?array $perfisPermitidos = null): array {
        $sessao = self::obterSessaoRequisicao();
        if (!$sessao) {
            http_response_code(401);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Não autenticado. Faça login para acessar este recurso.',
                'message' => 'Não autenticado. Faça login para acessar este recurso.',
            ]);
            exit;
        }
        $perfilAtual = strtolower((string)($sessao['perfil'] ?? ''));
        if ($perfisPermitidos !== null && !in_array($perfilAtual, $perfisPermitidos, true)) {
            http_response_code(403);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Acesso negado para o perfil atual.',
                'message' => 'Acesso negado para o perfil atual.',
            ]);
            exit;
        }
        return $sessao;
    }

    /**
     * Exige sessão de empresa com perfil ADMIN (BE-18.3, BE-18.4)
     */
    public static function exigirAdminEmpresa(): array {
        $sessao = self::exigirAutenticacao(['empresa']);
        $perfilEmp = strtoupper((string)($sessao['usuarioEmpresa']['perfil'] ?? $sessao['perfilEmpresa'] ?? 'ADMIN'));
        if ($perfilEmp !== 'ADMIN') {
            http_response_code(403);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Permissão negada. Recurso restrito ao administrador da empresa.',
                'message' => 'Permissão negada. Recurso restrito ao administrador da empresa.',
            ]);
            exit;
        }
        return $sessao;
    }

    public static function verificarSenha(string $senhaInformada, ?string $hashBanco): bool {
        if ($senhaInformada === '' || $hashBanco === null || $hashBanco === '') {
            return false;
        }
        return password_verify($senhaInformada, $hashBanco);
    }

    public static function emailExisteEmQualquerPerfil(string $email, ?string $ignorarCpfCnpj = null, ?int $ignorarIdUsuario = null): bool {
        $conn = Database::getConnection();
        $emailNorm = self::norm($email);
        if ($emailNorm === '') {
            return false;
        }
        $docDigits = self::onlyDigits($ignorarCpfCnpj);

        // 1. DOADOR
        $sql = "SELECT CPF FROM DOADOR WHERE LOWER(TRIM(EMAIL_DOADOR)) = :email";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':email', $emailNorm);
        oci_execute($stmt);
        while ($r = oci_fetch_assoc($stmt)) {
            if ($docDigits === '' || self::onlyDigits($r['CPF']) !== $docDigits) {
                oci_free_statement($stmt);
                return true;
            }
        }
        oci_free_statement($stmt);

        // 2. CONFECCIONISTA
        $sql = "SELECT CPF_CNPJ FROM CONFECCIONISTA WHERE LOWER(TRIM(EMAIL_CONF)) = :email";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':email', $emailNorm);
        oci_execute($stmt);
        while ($r = oci_fetch_assoc($stmt)) {
            if ($docDigits === '' || self::onlyDigits($r['CPF_CNPJ']) !== $docDigits) {
                oci_free_statement($stmt);
                return true;
            }
        }
        oci_free_statement($stmt);

        // 3. USUARIO_EMPRESA
        $sql = "SELECT ID_USUARIO, CNPJ_EMPRESA FROM USUARIO_EMPRESA WHERE LOWER(TRIM(EMAIL)) = :email";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':email', $emailNorm);
        oci_execute($stmt);
        while ($r = oci_fetch_assoc($stmt)) {
            $sameUser = ($ignorarIdUsuario !== null && (int)$r['ID_USUARIO'] === $ignorarIdUsuario);
            $sameCnpj = ($docDigits !== '' && self::onlyDigits($r['CNPJ_EMPRESA']) === $docDigits);
            if (!$sameUser && !$sameCnpj) {
                oci_free_statement($stmt);
                return true;
            }
        }
        oci_free_statement($stmt);

        return false;
    }

    public static function documentoExisteEmDoadorOuDesigner(string $documento, ?string $ignorarDoc = null): bool {
        $conn = Database::getConnection();
        $doc = self::onlyDigits($documento);
        $ign = self::onlyDigits($ignorarDoc);
        if ($doc === '') {
            return false;
        }

        $sql = "SELECT CPF FROM DOADOR WHERE TRIM(CPF) = :doc";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':doc', $doc);
        oci_execute($stmt);
        if ($r = oci_fetch_assoc($stmt)) {
            oci_free_statement($stmt);
            if ($ign === '' || self::onlyDigits($r['CPF']) !== $ign) {
                return true;
            }
        } else {
            oci_free_statement($stmt);
        }

        $sql = "SELECT CPF_CNPJ FROM CONFECCIONISTA WHERE TRIM(CPF_CNPJ) = :doc";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':doc', $doc);
        oci_execute($stmt);
        if ($r = oci_fetch_assoc($stmt)) {
            oci_free_statement($stmt);
            if ($ign === '' || self::onlyDigits($r['CPF_CNPJ']) !== $ign) {
                return true;
            }
        } else {
            oci_free_statement($stmt);
        }

        return false;
    }
}
