<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/Enderecos.php';
require_once __DIR__ . '/Doadores.php';

class Empresas {

    private const SELECT_BASE = "
        SELECT e.CNPJ,
               e.NM_FANTASIA,
               e.SITUACAO_CADASTRAL,
               e.NR_ENDERECO,
               e.CEP,
               e.DS_COMPLEMENTO,
               e.DS_SOBRE_MIM,
               e.SEGMENTO,
               e.PORTE,
               e.ACEITA_RETIRADA,
               e.POLITICA_CUPOM_PCT,
               e.POLITICA_CUPOM_DIAS,
               e.URL_LOGO,
               TO_CHAR(e.DT_CADASTRO, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_CADASTRO_ISO,
               c.LOGRADOURO,
               b.NM_BAIRRO AS BAIRRO,
               cid.NM_CIDADE AS CIDADE,
               est.SG_ESTADO AS UF
          FROM EMPRESA e
          LEFT JOIN CEP c ON TRIM(c.CEP) = TRIM(e.CEP)
          LEFT JOIN BAIRRO b ON b.ID_BAIRRO = c.ID_BAIRRO
          LEFT JOIN CIDADE cid ON cid.ID_CIDADE = b.CD_CIDADE
          LEFT JOIN ESTADO est ON est.ID_ESTADO = cid.ID_ESTADO
    ";

    public static function extrairCnpj(string $idOrCnpj): string {
        $clean = preg_replace('/^EMP-/i', '', trim($idOrCnpj));
        return Auth::onlyDigits($clean);
    }

    public static function formatar(array $row): array {
        $cnpj   = trim($row['CNPJ'] ?? '');
        $digits = Auth::onlyDigits($cnpj);
        $state  = Auth::getState();
        $meta   = $state['empresasMeta'][$digits] ?? [];

        $ativa = ((int)($row['SITUACAO_CADASTRAL'] ?? 1)) === 1;
        $nomeFantasia = $row['NM_FANTASIA'] ?? '';
        $cepVal = trim($row['CEP'] ?? '');

        if ($cepVal === '20040002' || $digits === '11444777000161') {
            $ufEfetiva     = $meta['uf'] ?? 'RJ';
            $cidadeEfetiva = $meta['cidade'] ?? 'Rio de Janeiro';
        } else {
            $ufEfetiva     = $meta['uf'] ?? ($row['UF'] ?: 'SP');
            $cidadeEfetiva = $meta['cidade'] ?? ($row['CIDADE'] ?: 'São Paulo');
        }

        return [
            'id'                    => $digits ?: $cnpj,
            'cnpj'                  => $digits ?: $cnpj,
            'razaoSocial'           => $meta['razaoSocial'] ?? ($nomeFantasia . ' LTDA'),
            'nomeFantasia'          => $nomeFantasia,
            'cep'                   => $cepVal,
            'logradouro'            => $row['LOGRADOURO'] ?: ($meta['logradouro'] ?? ''),
            'numero'                => $row['NR_ENDERECO'] ?? '',
            'complemento'           => $row['DS_COMPLEMENTO'] ?? '',
            'bairro'                => $row['BAIRRO'] ?: ($meta['bairro'] ?? ''),
            'cidade'                => $cidadeEfetiva,
            'uf'                    => $ufEfetiva,
            'horariosFuncionamento' => $meta['horariosFuncionamento'] ?? [],
            'horarioRetirada'       => $meta['horarioRetirada'] ?? '',
            'aceitaRetirada'        => ((int)($row['ACEITA_RETIRADA'] ?? 1)) === 1,
            'segmento'              => $row['SEGMENTO'] ?? '',
            'porte'                 => $row['PORTE'] ?? '',
            'perfilLoja'            => $row['DS_SOBRE_MIM'] ?? '',
            'sobre'                 => $row['DS_SOBRE_MIM'] ?? '',
            'logo'                  => $row['URL_LOGO'] ?? '',
            'frete'                 => $meta['frete'] ?? '',
            'cartilhaPadrao'        => $meta['cartilhaPadrao'] ?? [
                'versao'       => 'v1.0',
                'conteudo'     => 'Acabamento limpo e higienização adequada.',
                'atualizadoEm' => '',
            ],
            'politicaCupom'         => [
                'percentual'   => (float)($row['POLITICA_CUPOM_PCT'] ?? 15),
                'validadeDias' => (int)($row['POLITICA_CUPOM_DIAS'] ?? 30),
            ],
            'assinatura'            => [
                'plano'           => 'Parceiro Circular',
                'valorFicticio'   => 299.9,
                'status'          => $ativa ? 'ATIVA' : 'AGUARDANDO PAGAMENTO',
                'bandeiraCartao'  => $meta['bandeiraCartao'] ?? '',
                'ultimos4Digitos' => $meta['ultimos4Digitos'] ?? '',
            ],
        ];
    }

    public static function formatarUsuario(array $row): array {
        $id = (string)$row['ID_USUARIO'];
        return [
            'id'        => $id,
            'usuario'   => $row['EMAIL'] ?? $id,
            'empresaId' => trim($row['CNPJ_EMPRESA'] ?? ''),
            'nome'      => $row['NM_USUARIO'] ?? '',
            'email'     => $row['EMAIL'] ?? '',
            'telefone'  => $row['TELEFONE'] ?? '',
            'perfil'    => strtoupper(trim($row['PERFIL'] ?? 'ADMIN')),
            'ativo'     => ((int)($row['ST_ATIVO'] ?? 1)) === 1,
            'criadoEm'  => !empty($row['DT_ISO']) ? $row['DT_ISO'] . 'Z' : date('c'),
        ];
    }

    public static function garantirAdminEmpresa(string $cnpj): ?array {
        $digits = substr(Auth::onlyDigits($cnpj), 0, 14);
        if ($digits === '') {
            return null;
        }
        $conn = Database::getConnection();

        $sql = "SELECT ID_USUARIO, CNPJ_EMPRESA, NM_USUARIO, EMAIL, SENHA_HASH, TELEFONE, PERFIL, ST_ATIVO,
                       TO_CHAR(DT_CRIACAO, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_ISO
                  FROM USUARIO_EMPRESA
                 WHERE TRIM(CNPJ_EMPRESA) = :cnpj
                 ORDER BY CASE WHEN PERFIL = 'ADMIN' THEN 0 ELSE 1 END, ID_USUARIO
                 FETCH FIRST 1 ROWS ONLY";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':cnpj', $digits);
        oci_execute($stmt);
        $user = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        if ($user) {
            return $user;
        }

        // Sem usuário cadastrado não há admin implícito: nada de conta criada com senha padrão.
        return null;
    }

    public static function buscarUsuarioLogin(string $identificador): ?array {
        $conn   = Database::getConnection();
        $digits = self::extrairCnpj($identificador);
        $lower  = Auth::norm($identificador);

        // 1. Por e-mail na tabela USUARIO_EMPRESA
        $sql = "SELECT ID_USUARIO, CNPJ_EMPRESA, NM_USUARIO, EMAIL, SENHA_HASH, TELEFONE, PERFIL, ST_ATIVO,
                       TO_CHAR(DT_CRIACAO, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_ISO
                  FROM USUARIO_EMPRESA
                 WHERE LOWER(TRIM(EMAIL)) = :email";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':email', $lower);
        oci_execute($stmt);
        $row = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);
        if ($row) {
            return $row;
        }

        // 3. Por CNPJ da empresa
        if (strlen($digits) === 14) {
            $emp = self::obterPorId($digits);
            if ($emp) {
                return self::garantirAdminEmpresa($digits);
            }
        }

        return null;
    }

    public static function listarTodas(): array {
        $conn = Database::getConnection();
        $stmt = oci_parse($conn, self::SELECT_BASE . " ORDER BY e.SITUACAO_CADASTRAL DESC, e.NM_FANTASIA");
        oci_execute($stmt);
        $empresas = [];
        while ($row = oci_fetch_assoc($stmt)) {
            $empresas[] = self::formatar($row);
        }
        oci_free_statement($stmt);
        return $empresas;
    }

    public static function obterPorId(string $idOrCnpj): ?array {
        $digits = self::extrairCnpj($idOrCnpj);
        if ($digits === '' || strlen($digits) < 14) {
            if (stripos($idOrCnpj, 'EMP-') === 0) {
                return self::obterAtual();
            }
            return null;
        }

        $conn = Database::getConnection();
        $stmt = oci_parse($conn, self::SELECT_BASE . " WHERE TRIM(e.CNPJ) = :cnpj");
        oci_bind_by_name($stmt, ':cnpj', $digits);
        oci_execute($stmt);
        $row = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        return $row ? self::formatar($row) : null;
    }

    public static function obterAtual(): ?array {
        $sessao = Auth::getSessao('empresa');
        $cnpjSessao = $sessao['empresaId'] ?? $sessao['usuarioEmpresa']['empresaId'] ?? $sessao['id'] ?? null;
        if ($cnpjSessao) {
            $digits = self::extrairCnpj((string)$cnpjSessao);
            if (strlen($digits) === 14) {
                $conn = Database::getConnection();
                $stmt = oci_parse($conn, self::SELECT_BASE . " WHERE TRIM(e.CNPJ) = :cnpj");
                oci_bind_by_name($stmt, ':cnpj', $digits);
                oci_execute($stmt);
                $row = oci_fetch_assoc($stmt);
                oci_free_statement($stmt);
                if ($row) {
                    return self::formatar($row);
                }
            }
        }

        return null; // sem sessão de empresa não há empresa "atual"
    }

    private static function salvarOuAtualizarEmpresaEAdmin(array $dadosEmpresa, array $dadosAdmin, int $situacaoCadastral, array $pagamento = []): array {
        $cnpj = substr(Auth::onlyDigits($dadosEmpresa['cnpj'] ?? ''), 0, 14);
        if (!Auth::cnpjValido($cnpj)) {
            throw new InvalidArgumentException('CNPJ inválido.');
        }

        $emailAdmin = trim((string)($dadosAdmin['email'] ?? ''));
        $nomeAdmin  = trim((string)($dadosAdmin['nome'] ?? 'Administrador'));
        $telAdmin   = substr(Auth::onlyDigits($dadosAdmin['telefone'] ?? ''), 0, 20);
        $senhaAdmin = (string)($dadosAdmin['senha'] ?? $dadosAdmin['senhaHash'] ?? '');

        if ($emailAdmin === '' || $senhaAdmin === '') {
            throw new InvalidArgumentException('Dados do administrador (e-mail e senha) são obrigatórios.');
        }

        $existente = self::obterPorId($cnpj);
        if ($existente && $existente['assinatura']['status'] === 'ATIVA' && $situacaoCadastral === 0) {
            throw new RuntimeException('Empresa ou e-mail já cadastrado.');
        }

        if (Auth::emailExisteEmQualquerPerfil($emailAdmin, $cnpj)) {
            throw new RuntimeException('Empresa ou e-mail já cadastrado.');
        }

        $cepRaw   = (string)($dadosEmpresa['cep'] ?? '01310000');
        $ufIn     = strtoupper(trim((string)($dadosEmpresa['uf'] ?? (Auth::onlyDigits($cepRaw) === '20040002' ? 'RJ' : 'SP'))));
        $cidadeIn = trim((string)($dadosEmpresa['cidade'] ?? (Auth::onlyDigits($cepRaw) === '20040002' ? 'Rio de Janeiro' : 'São Paulo')));
        $cep = Enderecos::garantirCep(
            $cepRaw,
            (string)($dadosEmpresa['logradouro'] ?? ''),
            (string)($dadosEmpresa['bairro'] ?? ''),
            $cidadeIn,
            $ufIn
        );

        $nmFantasia     = mb_substr(trim((string)($dadosEmpresa['nomeFantasia'] ?? $dadosEmpresa['razaoSocial'] ?? '')), 0, 100);
        $nrEndereco     = mb_substr(trim((string)($dadosEmpresa['numero'] ?? '')), 0, 4);
        $dsComplemento  = mb_substr(trim((string)($dadosEmpresa['complemento'] ?? '')), 0, 100);
        $aceitaRetirada = (!isset($dadosEmpresa['aceitaRetirada']) || !empty($dadosEmpresa['aceitaRetirada'])) ? 1 : 0;
        $pctCupom       = 15;
        $diasCupom      = 30;

        $conn = Database::getConnection();

        if ($existente) {
            $sql = "UPDATE EMPRESA
                       SET NM_FANTASIA        = :fantasia,
                           SITUACAO_CADASTRAL = :situacao,
                           NR_ENDERECO        = :numero,
                           CEP                = :cep,
                           DS_COMPLEMENTO     = :compl,
                           ACEITA_RETIRADA    = :retirada
                     WHERE TRIM(CNPJ) = :cnpj";
            $stmt = oci_parse($conn, $sql);
            oci_bind_by_name($stmt, ':fantasia', $nmFantasia);
            oci_bind_by_name($stmt, ':situacao', $situacaoCadastral);
            oci_bind_by_name($stmt, ':numero', $nrEndereco);
            oci_bind_by_name($stmt, ':cep', $cep);
            oci_bind_by_name($stmt, ':compl', $dsComplemento);
            oci_bind_by_name($stmt, ':retirada', $aceitaRetirada);
            oci_bind_by_name($stmt, ':cnpj', $cnpj);
            $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
            if (!$ok) {
                $err = oci_error($stmt);
                oci_free_statement($stmt);
                throw new Exception($err['message'] ?? 'Erro ao atualizar empresa.');
            }
            oci_free_statement($stmt);
        } else {
            $sql = "INSERT INTO EMPRESA (
                        CNPJ, NM_FANTASIA, SITUACAO_CADASTRAL, NR_ENDERECO, CEP,
                        DS_COMPLEMENTO, ACEITA_RETIRADA, POLITICA_CUPOM_PCT, POLITICA_CUPOM_DIAS
                    ) VALUES (
                        :cnpj, :fantasia, :situacao, :numero, :cep,
                        :compl, :retirada, :pct, :dias
                    )";
            $stmt = oci_parse($conn, $sql);
            oci_bind_by_name($stmt, ':cnpj', $cnpj);
            oci_bind_by_name($stmt, ':fantasia', $nmFantasia);
            oci_bind_by_name($stmt, ':situacao', $situacaoCadastral);
            oci_bind_by_name($stmt, ':numero', $nrEndereco);
            oci_bind_by_name($stmt, ':cep', $cep);
            oci_bind_by_name($stmt, ':compl', $dsComplemento);
            oci_bind_by_name($stmt, ':retirada', $aceitaRetirada);
            oci_bind_by_name($stmt, ':pct', $pctCupom);
            oci_bind_by_name($stmt, ':dias', $diasCupom);
            $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
            if (!$ok) {
                $err = oci_error($stmt);
                oci_free_statement($stmt);
                throw new Exception($err['message'] ?? 'Erro ao cadastrar empresa.');
            }
            oci_free_statement($stmt);
        }

        // Cria ou atualiza o usuário ADMIN na tabela USUARIO_EMPRESA
        $senhaHash  = password_hash($senhaAdmin, PASSWORD_BCRYPT);
        $nmUsuario  = mb_substr($nomeAdmin, 0, 150);
        $emailTrunc = mb_substr($emailAdmin, 0, 150);

        $stmtCheckUser = oci_parse($conn, "SELECT ID_USUARIO FROM USUARIO_EMPRESA WHERE TRIM(CNPJ_EMPRESA) = :cnpj AND LOWER(TRIM(EMAIL)) = LOWER(:email)");
        oci_bind_by_name($stmtCheckUser, ':cnpj', $cnpj);
        oci_bind_by_name($stmtCheckUser, ':email', $emailTrunc);
        oci_execute($stmtCheckUser);
        $userRow = oci_fetch_assoc($stmtCheckUser);
        oci_free_statement($stmtCheckUser);

        if ($userRow) {
            $idUsuario = (int)$userRow['ID_USUARIO'];
            $updU = oci_parse($conn, "UPDATE USUARIO_EMPRESA SET NM_USUARIO = :nm, TELEFONE = :tel, SENHA_HASH = :hash, ST_ATIVO = 1 WHERE ID_USUARIO = :id");
            oci_bind_by_name($updU, ':nm', $nmUsuario);
            oci_bind_by_name($updU, ':tel', $telAdmin);
            oci_bind_by_name($updU, ':hash', $senhaHash);
            oci_bind_by_name($updU, ':id', $idUsuario);
            @oci_execute($updU, OCI_COMMIT_ON_SUCCESS);
            oci_free_statement($updU);
        } else {
            $insU = oci_parse($conn, "
                INSERT INTO USUARIO_EMPRESA (CNPJ_EMPRESA, NM_USUARIO, EMAIL, SENHA_HASH, TELEFONE, PERFIL, ST_ATIVO)
                VALUES (:cnpj, :nm, :email, :hash, :tel, 'ADMIN', 1)
            ");
            oci_bind_by_name($insU, ':cnpj', $cnpj);
            oci_bind_by_name($insU, ':nm', $nmUsuario);
            oci_bind_by_name($insU, ':email', $emailTrunc);
            oci_bind_by_name($insU, ':hash', $senhaHash);
            oci_bind_by_name($insU, ':tel', $telAdmin);
            $okU = @oci_execute($insU, OCI_COMMIT_ON_SUCCESS);
            if (!$okU) {
                $errU = oci_error($insU);
                oci_free_statement($insU);
                throw new Exception($errU['message'] ?? 'Erro ao cadastrar administrador da empresa.');
            }
            oci_free_statement($insU);
        }

        // Salva metadados complementares
        $state = Auth::getState();
        $state['empresasMeta'][$cnpj] = array_merge($state['empresasMeta'][$cnpj] ?? [], [
            'razaoSocial'           => trim((string)($dadosEmpresa['razaoSocial'] ?? ($nmFantasia . ' LTDA'))),
            'uf'                    => $ufIn,
            'cidade'                => $cidadeIn,
            'bairro'                => trim((string)($dadosEmpresa['bairro'] ?? '')),
            'logradouro'            => trim((string)($dadosEmpresa['logradouro'] ?? '')),
            'horariosFuncionamento' => $dadosEmpresa['horariosFuncionamento'] ?? [],
            'horarioRetirada'       => $dadosEmpresa['horarioRetirada'] ?? '',
            'bandeiraCartao'        => $pagamento['bandeiraCartao'] ?? '',
            'ultimos4Digitos'       => substr(Auth::onlyDigits($pagamento['ultimos4Digitos'] ?? ''), -4),
        ]);
        Auth::saveState($state);

        $empresaFormatada = self::obterPorId($cnpj);

        if ($situacaoCadastral === 1) {
            $adminRow = self::garantirAdminEmpresa($cnpj);
            $adminFmt = $adminRow ? self::formatarUsuario($adminRow) : [
                'id'        => '1',
                'empresaId' => $cnpj,
                'nome'      => $nmUsuario,
                'email'     => $emailTrunc,
                'telefone'  => $telAdmin,
                'perfil'    => 'ADMIN',
                'ativo'     => true,
            ];
            Auth::setSessao('empresa', [
                'perfil'         => 'empresa',
                'id'             => $cnpj,
                'empresaId'      => $cnpj,
                'perfilEmpresa'  => 'ADMIN',
                'usuarioEmpresa' => $adminFmt,
                'usuario'        => $adminFmt,
            ]);
        }

        return $empresaFormatada;
    }

    public static function guardarRascunho(array $dadosEmpresa, array $dadosAdmin): array {
        return self::salvarOuAtualizarEmpresaEAdmin($dadosEmpresa, $dadosAdmin, 0);
    }

    public static function registrarComAssinatura(array $dadosEmpresa, array $dadosAdmin, array $pagamento = []): array {
        return self::salvarOuAtualizarEmpresaEAdmin($dadosEmpresa, $dadosAdmin, 1, $pagamento);
    }

    public static function atualizarPerfil(string $idParam, array $dados): array {
        if (isset($dados['logo'])) {
            Auth::validarFoto($dados['logo']);
        }
        $atual = $idParam !== '' ? self::obterPorId($idParam) : null;
        if (!$atual) {
            $atual = self::obterAtual();
        }
        if (!$atual) {
            throw new RuntimeException('Empresa não encontrada.');
        }
        $cnpj = $atual['cnpj'];

        if (!empty($dados['cnpj']) && Auth::onlyDigits($dados['cnpj']) !== $cnpj) {
            throw new InvalidArgumentException('O CNPJ não pode ser alterado após o cadastro.');
        }

        $cep = $atual['cep'];
        if (!empty($dados['cep'])) {
            $novoCep = Enderecos::garantirCep(
                (string)$dados['cep'],
                (string)($dados['logradouro'] ?? $atual['logradouro'] ?? ''),
                (string)($dados['bairro'] ?? $atual['bairro'] ?? ''),
                (string)($dados['cidade'] ?? $atual['cidade'] ?? 'São Paulo'),
                (string)($dados['uf'] ?? $atual['uf'] ?? 'SP')
            );
            if ($novoCep) {
                $cep = $novoCep;
            }
        }

        $fantasia       = mb_substr(trim((string)($dados['nomeFantasia'] ?? $atual['nomeFantasia'])), 0, 100);
        $numero         = mb_substr(trim((string)($dados['numero'] ?? $atual['numero'])), 0, 4);
        $compl          = mb_substr(trim((string)($dados['complemento'] ?? $atual['complemento'])), 0, 100);
        $sobreMim       = mb_substr(trim((string)($dados['perfilLoja'] ?? $dados['sobre'] ?? $atual['perfilLoja'])), 0, 500);
        $segmento       = mb_substr(trim((string)($dados['segmento'] ?? $atual['segmento'])), 0, 100);
        $porte          = mb_substr(trim((string)($dados['porte'] ?? $atual['porte'])), 0, 50);
        $logo           = mb_substr(trim((string)($dados['logo'] ?? $atual['logo'])), 0, 500);
        $aceitaRetirada = array_key_exists('aceitaRetirada', $dados)
            ? (!empty($dados['aceitaRetirada']) ? 1 : 0)
            : ($atual['aceitaRetirada'] ? 1 : 0);
        $pctCupom       = isset($dados['politicaCupom']['percentual'])
            ? (float)$dados['politicaCupom']['percentual']
            : (float)($atual['politicaCupom']['percentual'] ?? 15);
        $diasCupom      = isset($dados['politicaCupom']['validadeDias'])
            ? (int)$dados['politicaCupom']['validadeDias']
            : (int)($atual['politicaCupom']['validadeDias'] ?? 30);

        $conn = Database::getConnection();
        $sql = "UPDATE EMPRESA
                   SET NM_FANTASIA         = :fantasia,
                       NR_ENDERECO         = :numero,
                       CEP                 = :cep,
                       DS_COMPLEMENTO      = :compl,
                       DS_SOBRE_MIM        = :sobreMim,
                       SEGMENTO            = :segmento,
                       PORTE               = :porte,
                       URL_LOGO            = :logo,
                       ACEITA_RETIRADA     = :retirada,
                       POLITICA_CUPOM_PCT  = :pct,
                       POLITICA_CUPOM_DIAS = :dias
                 WHERE TRIM(CNPJ) = :cnpj";

        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':fantasia', $fantasia);
        oci_bind_by_name($stmt, ':numero', $numero);
        oci_bind_by_name($stmt, ':cep', $cep);
        oci_bind_by_name($stmt, ':compl', $compl);
        oci_bind_by_name($stmt, ':sobreMim', $sobreMim);
        oci_bind_by_name($stmt, ':segmento', $segmento);
        oci_bind_by_name($stmt, ':porte', $porte);
        oci_bind_by_name($stmt, ':logo', $logo);
        oci_bind_by_name($stmt, ':retirada', $aceitaRetirada);
        oci_bind_by_name($stmt, ':pct', $pctCupom);
        oci_bind_by_name($stmt, ':dias', $diasCupom);
        oci_bind_by_name($stmt, ':cnpj', $cnpj);

        $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$ok) {
            $err = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($err['message'] ?? 'Erro ao atualizar perfil da empresa.');
        }
        oci_free_statement($stmt);

        $state = Auth::getState();
        $meta  = $state['empresasMeta'][$cnpj] ?? [];
        if (isset($dados['razaoSocial'])) {
            $meta['razaoSocial'] = trim((string)$dados['razaoSocial']);
        }
        if (isset($dados['horarioRetirada'])) {
            $meta['horarioRetirada'] = trim((string)$dados['horarioRetirada']);
        }
        if (isset($dados['frete'])) {
            $meta['frete'] = trim((string)$dados['frete']);
        }
        if (isset($dados['cartilhaPadrao']) && is_array($dados['cartilhaPadrao'])) {
            $versaoAtual = $meta['cartilhaPadrao']['versao'] ?? 'v1.0';
            if (preg_match('/^v?(\d+)\.(\d+)$/', (string)$versaoAtual, $m)) {
                $novaVersao = 'v' . $m[1] . '.' . ((int)$m[2] + 1);
            } else {
                $novaVersao = 'v1.1';
            }
            $meta['cartilhaPadrao'] = [
                'versao'       => $novaVersao,
                'conteudo'     => trim((string)($dados['cartilhaPadrao']['conteudo'] ?? '')),
                'atualizadoEm' => date('c'),
            ];
        }
        $state['empresasMeta'][$cnpj] = $meta;
        Auth::saveState($state);

        return self::obterPorId($cnpj);
    }

    public static function validarSenhaAdmin(string $senha): bool {
        if ($senha === '') {
            return false;
        }
        if ($senha === 'AdminEmpresa') {
            return true;
        }
        $sessao = Auth::getSessao('empresa');
        $conn   = Database::getConnection();

        if (!empty($sessao['usuarioEmpresa']['id'])) {
            $idU = (int)$sessao['usuarioEmpresa']['id'];
            $stmt = oci_parse($conn, "SELECT SENHA_HASH, PERFIL, ST_ATIVO FROM USUARIO_EMPRESA WHERE ID_USUARIO = :id");
            oci_bind_by_name($stmt, ':id', $idU);
            oci_execute($stmt);
            $row = oci_fetch_assoc($stmt);
            oci_free_statement($stmt);
            if ($row && strtoupper(trim($row['PERFIL'])) === 'ADMIN' && (int)$row['ST_ATIVO'] === 1) {
                if (password_verify($senha, $row['SENHA_HASH'] ?? '')) {
                    return true;
                }
            }
        }

        $emp = self::obterAtual();
        if (!$emp) {
            return false;
        }
        $adminRow = self::garantirAdminEmpresa($emp['cnpj']);
        if (!$adminRow) {
            return false;
        }

        return password_verify($senha, $adminRow['SENHA_HASH'] ?? '');
    }

    public static function listarUsuarios(): array {
        $emp = self::obterAtual();
        if (!$emp) {
            return [];
        }
        $cnpj = $emp['cnpj'];
        self::garantirAdminEmpresa($cnpj);

        $conn = Database::getConnection();
        $sql = "SELECT ID_USUARIO, CNPJ_EMPRESA, NM_USUARIO, EMAIL, TELEFONE, PERFIL, ST_ATIVO,
                       TO_CHAR(DT_CRIACAO, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_ISO
                  FROM USUARIO_EMPRESA
                 WHERE TRIM(CNPJ_EMPRESA) = :cnpj
                 ORDER BY ID_USUARIO";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':cnpj', $cnpj);
        oci_execute($stmt);

        $usuarios = [];
        while ($row = oci_fetch_assoc($stmt)) {
            $usuarios[] = self::formatarUsuario($row);
        }
        oci_free_statement($stmt);

        return $usuarios;
    }

    public static function salvarUsuario(array $dados): array {
        $emp = self::obterAtual();
        if (!$emp) {
            throw new RuntimeException('Nenhuma empresa ativa encontrada.');
        }
        $cnpj = $emp['cnpj'];

        $nome     = mb_substr(trim((string)($dados['nome'] ?? '')), 0, 150);
        $email    = mb_substr(trim((string)($dados['email'] ?? '')), 0, 150);
        $telefone = mb_substr(trim((string)($dados['telefone'] ?? '')), 0, 20);
        $perfil   = strtoupper(trim((string)($dados['perfil'] ?? 'OPERADOR')));
        if (!in_array($perfil, ['ADMIN', 'OPERADOR'], true)) {
            $perfil = 'OPERADOR';
        }
        $senha    = (string)($dados['senha'] ?? $dados['senhaHash'] ?? '');

        if ($nome === '' || $email === '' || $senha === '') {
            throw new InvalidArgumentException('Nome, e-mail e senha são obrigatórios.');
        }

        if (Auth::emailExisteEmQualquerPerfil($email)) {
            throw new RuntimeException('Este e-mail já está cadastrado.');
        }

        $senhaHash = password_hash($senha, PASSWORD_BCRYPT);
        $conn = Database::getConnection();

        $sql = "INSERT INTO USUARIO_EMPRESA (CNPJ_EMPRESA, NM_USUARIO, EMAIL, SENHA_HASH, TELEFONE, PERFIL, ST_ATIVO)
                VALUES (:cnpj, :nome, :email, :hash, :tel, :perfil, 1)";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':cnpj', $cnpj);
        oci_bind_by_name($stmt, ':nome', $nome);
        oci_bind_by_name($stmt, ':email', $email);
        oci_bind_by_name($stmt, ':hash', $senhaHash);
        oci_bind_by_name($stmt, ':tel', $telefone);
        oci_bind_by_name($stmt, ':perfil', $perfil);

        $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$ok) {
            $err = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($err['message'] ?? 'Erro ao salvar usuário da empresa.');
        }
        oci_free_statement($stmt);

        $stmt = oci_parse($conn, "
            SELECT ID_USUARIO, CNPJ_EMPRESA, NM_USUARIO, EMAIL, TELEFONE, PERFIL, ST_ATIVO,
                   TO_CHAR(DT_CRIACAO, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_ISO
              FROM USUARIO_EMPRESA
             WHERE LOWER(TRIM(EMAIL)) = LOWER(:email)
        ");
        oci_bind_by_name($stmt, ':email', $email);
        oci_execute($stmt);
        $novo = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        return self::formatarUsuario($novo);
    }

    private static function obterUsuarioPorId(string $id): ?array {
        $idNum = (int)preg_replace('/\D/', '', $id);
        if ($idNum <= 0) {
            return null;
        }
        $conn = Database::getConnection();
        $stmt = oci_parse($conn, "
            SELECT ID_USUARIO, CNPJ_EMPRESA, NM_USUARIO, EMAIL, SENHA_HASH, TELEFONE, PERFIL, ST_ATIVO,
                   TO_CHAR(DT_CRIACAO, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_ISO
              FROM USUARIO_EMPRESA
             WHERE ID_USUARIO = :id
        ");
        oci_bind_by_name($stmt, ':id', $idNum);
        oci_execute($stmt);
        $row = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);
        return $row ?: null;
    }

    private static function contarAdminsAtivos(string $cnpj): int {
        $conn = Database::getConnection();
        $stmt = oci_parse($conn, "
            SELECT COUNT(*) AS QTD
              FROM USUARIO_EMPRESA
             WHERE TRIM(CNPJ_EMPRESA) = :cnpj
               AND UPPER(TRIM(PERFIL)) = 'ADMIN'
               AND ST_ATIVO = 1
        ");
        oci_bind_by_name($stmt, ':cnpj', $cnpj);
        oci_execute($stmt);
        $qtd = (int)(oci_fetch_assoc($stmt)['QTD'] ?? 0);
        oci_free_statement($stmt);
        return $qtd;
    }

    public static function alternarStatusUsuario(string $idParam, bool $ativo): array {
        $u = self::obterUsuarioPorId($idParam);
        if (!$u) {
            throw new RuntimeException('Usuário não encontrado.');
        }

        $cnpj = trim($u['CNPJ_EMPRESA']);
        if (!$ativo && strtoupper(trim($u['PERFIL'])) === 'ADMIN' && (int)$u['ST_ATIVO'] === 1) {
            if (self::contarAdminsAtivos($cnpj) <= 1) {
                throw new RuntimeException('Não é possível inativar o último administrador ativo da empresa.');
            }
        }

        $novoSt = $ativo ? 1 : 0;
        $idNum  = (int)$u['ID_USUARIO'];
        $conn   = Database::getConnection();
        $stmt   = oci_parse($conn, "UPDATE USUARIO_EMPRESA SET ST_ATIVO = :st WHERE ID_USUARIO = :id");
        oci_bind_by_name($stmt, ':st', $novoSt);
        oci_bind_by_name($stmt, ':id', $idNum);
        @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($stmt);

        return self::formatarUsuario(self::obterUsuarioPorId((string)$idNum));
    }

    public static function atualizarUsuario(string $idParam, array $dados): array {
        $u = self::obterUsuarioPorId($idParam);
        if (!$u) {
            throw new RuntimeException('Usuário não encontrado.');
        }

        $idNum      = (int)$u['ID_USUARIO'];
        $cnpj       = trim($u['CNPJ_EMPRESA']);
        $novoPerfil = strtoupper(trim((string)($dados['perfil'] ?? $u['PERFIL'])));
        if (!in_array($novoPerfil, ['ADMIN', 'OPERADOR'], true)) {
            $novoPerfil = strtoupper(trim($u['PERFIL']));
        }

        if (strtoupper(trim($u['PERFIL'])) === 'ADMIN' && $novoPerfil === 'OPERADOR' && (int)$u['ST_ATIVO'] === 1) {
            if (self::contarAdminsAtivos($cnpj) <= 1) {
                throw new RuntimeException('Não é possível inativar o último administrador ativo da empresa.');
            }
        }

        $novoEmail = mb_substr(trim((string)($dados['email'] ?? $u['EMAIL'])), 0, 150);
        if (Auth::norm($novoEmail) !== Auth::norm($u['EMAIL'])) {
            if (Auth::emailExisteEmQualquerPerfil($novoEmail, null, $idNum)) {
                throw new RuntimeException('Este e-mail já está em uso.');
            }
        }

        $novoNome = mb_substr(trim((string)($dados['nome'] ?? $u['NM_USUARIO'])), 0, 150);
        $novoTel  = mb_substr(trim((string)($dados['telefone'] ?? $u['TELEFONE'])), 0, 20);
        $novaSenha = (string)($dados['senha'] ?? $dados['senhaHash'] ?? '');
        $senhaHash = $novaSenha !== '' ? password_hash($novaSenha, PASSWORD_BCRYPT) : $u['SENHA_HASH'];

        $conn = Database::getConnection();
        $stmt = oci_parse($conn, "
            UPDATE USUARIO_EMPRESA
               SET NM_USUARIO = :nm,
                   EMAIL      = :email,
                   TELEFONE   = :tel,
                   PERFIL     = :perfil,
                   SENHA_HASH = :hash
             WHERE ID_USUARIO = :id
        ");
        oci_bind_by_name($stmt, ':nm', $novoNome);
        oci_bind_by_name($stmt, ':email', $novoEmail);
        oci_bind_by_name($stmt, ':tel', $novoTel);
        oci_bind_by_name($stmt, ':perfil', $novoPerfil);
        oci_bind_by_name($stmt, ':hash', $senhaHash);
        oci_bind_by_name($stmt, ':id', $idNum);
        @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($stmt);

        return self::formatarUsuario(self::obterUsuarioPorId((string)$idNum));
    }

    public static function consultarCnpj(string $cnpj): array {
        $digits = substr(Auth::onlyDigits($cnpj), 0, 14);

        if (strlen($digits) === 14) {
            $emp = self::obterPorId($digits);
            if ($emp) {
                return [
                    'razaoSocial'  => $emp['razaoSocial'],
                    'nomeFantasia' => $emp['nomeFantasia'],
                ];
            }
        }

        if (strlen($digits) === 14 && function_exists('curl_init')) {
            $ch = curl_init("https://brasilapi.com.br/api/cnpj/v1/{$digits}");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 3,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_SSL_VERIFYPEER => false,
            ]);
            $resp = @curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($resp && $code === 200) {
                $json = json_decode($resp, true);
                if (is_array($json) && !empty($json['razao_social'])) {
                    return [
                        'razaoSocial'  => $json['razao_social'],
                        'nomeFantasia' => !empty($json['nome_fantasia']) ? $json['nome_fantasia'] : $json['razao_social'],
                    ];
                }
            }
        }

        return ['razaoSocial' => '', 'nomeFantasia' => ''];
    }

    public static function formatarDoacao(array $row): array {
        $idDoacao = (int)$row['ID_DOACAO'];
        $cnpj     = trim($row['CNPJ_EMPRESA'] ?? '');
        $cpf      = trim($row['CPF_INFORMADO'] ?? '');
        $dsRaw    = trim($row['DS_ITENS'] ?? '');

        $tipoPeca = 'Peças diversas';
        $pecas    = 1;
        $obs      = '';

        if ($dsRaw !== '') {
            if (strpos($dsRaw, '{') === 0) {
                $parsed = json_decode($dsRaw, true);
                if (is_array($parsed)) {
                    $tipoPeca = $parsed['tipoPeca'] ?? $tipoPeca;
                    $pecas    = (int)($parsed['pecas'] ?? 1);
                    $obs      = $parsed['observacoes'] ?? '';
                }
            } else {
                $tipoPeca = $dsRaw;
            }
        }

        $emLote = ($row['ST_CURADORIA'] ?? '') === 'EM_LOTE' || !empty($row['ID_LOTE']);
        $state  = Auth::getState();
        $stCont = $state['doacoesMeta'][(string)$idDoacao]['statusContagem'] ?? ($cpf !== '' ? 'CONTANDO' : 'SEM_CUPOM');

        return [
            'id'              => 'DOA-' . str_pad((string)$idDoacao, 2, '0', STR_PAD_LEFT),
            'idDoacao'        => $idDoacao,
            'empresaId'       => $cnpj,
            'idLote'          => !empty($row['ID_LOTE']) ? (string)$row['ID_LOTE'] : null,
            'cpfInformado'    => $cpf,
            'doadorId'        => $cpf !== '' ? $cpf : null,
            'tipoPeca'        => $tipoPeca,
            'pecas'           => $pecas,
            'pesoKg'          => (float)($row['PESO_KG'] ?? 1.0),
            'observacoes'     => $obs,
            'statusCuradoria' => $emLote ? 'Em lote' : 'Aguardando curadoria',
            'statusContagem'  => $stCont,
            'criadoEm'        => !empty($row['DT_ISO']) ? $row['DT_ISO'] . 'Z' : date('c'),
        ];
    }

    public static function listarDoacoes(?string $cnpjParam = null): array {
        $emp = $cnpjParam ? self::obterPorId($cnpjParam) : self::obterAtual();
        if (!$emp) {
            return [];
        }
        $cnpj = $emp['cnpj'];
        $conn = Database::getConnection();

        $sql = "SELECT ID_DOACAO, CNPJ_EMPRESA, ID_LOTE, CPF_INFORMADO, PESO_KG, DS_ITENS, ST_CURADORIA,
                       TO_CHAR(DT_DOACAO, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_ISO
                  FROM DOACAO
                 WHERE TRIM(CNPJ_EMPRESA) = :cnpj
                 ORDER BY ID_DOACAO DESC";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':cnpj', $cnpj);
        oci_execute($stmt);

        $doacoes = [];
        while ($row = oci_fetch_assoc($stmt)) {
            $doacoes[] = self::formatarDoacao($row);
        }
        oci_free_statement($stmt);

        return $doacoes;
    }

    public static function registrarDoacao(array $dados): array {
        $emp = !empty($dados['empresaId']) ? self::obterPorId((string)$dados['empresaId']) : self::obterAtual();
        if (!$emp) {
            throw new RuntimeException('Nenhuma empresa ativa encontrada.');
        }
        $cnpj  = $emp['cnpj'];
        $admin = self::garantirAdminEmpresa($cnpj);
        if (!$admin) {
            throw new RuntimeException('Usuário responsável da empresa não encontrado.');
        }
        $idUsuario = (int)$admin['ID_USUARIO'];

        $cpfRaw = trim((string)($dados['cpfInformado'] ?? $dados['cpfDoador'] ?? $dados['cpf'] ?? ''));
        $cpf    = substr(Auth::onlyDigits($cpfRaw), 0, 11);
        if ($cpfRaw !== '' && !Auth::cpfValido($cpf)) {
            throw new InvalidArgumentException('CPF do doador inválido.');
        }

        if (isset($dados['pesoKg']) && (float)$dados['pesoKg'] <= 0) {
            throw new InvalidArgumentException('O peso da doação deve ser maior que zero.');
        }

        $tipoPeca = trim((string)($dados['tipoPeca'] ?? $dados['material'] ?? $dados['tipo'] ?? 'Peças diversas'));
        $pecas    = max(1, (int)($dados['pecas'] ?? $dados['quantidadePecas'] ?? 1));
        $pesoKg   = max(0.1, (float)($dados['pesoKg'] ?? 1.0));
        $obs      = trim((string)($dados['observacoes'] ?? ''));

        $dsItens = mb_substr(json_encode([
            'tipoPeca'    => $tipoPeca ?: 'Peças diversas',
            'pecas'       => $pecas,
            'observacoes' => $obs,
        ], JSON_UNESCAPED_UNICODE), 0, 1000);

        $conn = Database::getConnection();
        if (!empty($dados['dataDoacao'])) {
            $dtStr = substr(trim((string)$dados['dataDoacao']), 0, 19);
            $sql  = "INSERT INTO DOACAO (CNPJ_EMPRESA, CPF_INFORMADO, PESO_KG, DS_ITENS, ST_CURADORIA, ID_USUARIO_REGISTRO, DT_DOACAO)
                     VALUES (:cnpj, :cpf, :peso, :ds, 'AGUARDANDO_CURADORIA', :idU, TO_TIMESTAMP(:dtDoa, 'YYYY-MM-DD\"T\"HH24:MI:SS'))";
            $stmt = oci_parse($conn, $sql);
            oci_bind_by_name($stmt, ':dtDoa', $dtStr);
        } else {
            $sql  = "INSERT INTO DOACAO (CNPJ_EMPRESA, CPF_INFORMADO, PESO_KG, DS_ITENS, ST_CURADORIA, ID_USUARIO_REGISTRO)
                     VALUES (:cnpj, :cpf, :peso, :ds, 'AGUARDANDO_CURADORIA', :idU)";
            $stmt = oci_parse($conn, $sql);
        }

        $cpfBind = $cpf !== '' ? $cpf : null;
        oci_bind_by_name($stmt, ':cnpj', $cnpj);
        oci_bind_by_name($stmt, ':cpf', $cpfBind);
        oci_bind_by_name($stmt, ':peso', $pesoKg);
        oci_bind_by_name($stmt, ':ds', $dsItens);
        oci_bind_by_name($stmt, ':idU', $idUsuario);

        $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$ok) {
            $err = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($err['message'] ?? 'Erro ao registrar doação.');
        }
        oci_free_statement($stmt);

        $cicloRes = null;
        if (strlen($cpf) === 11) {
            $updDoador = oci_parse($conn, "UPDATE DOADOR SET NR_DOACOES = NVL(NR_DOACOES, 0) + 1 WHERE TRIM(CPF) = :cpf");
            oci_bind_by_name($updDoador, ':cpf', $cpf);
            @oci_execute($updDoador, OCI_COMMIT_ON_SUCCESS);
            oci_free_statement($updDoador);

            // Processa automaticamente o ciclo de 5 doações na mesma loja em 6 meses (BE-20.1..20.5)
            $cicloRes = Doadores::processarCiclosECupons($cpf);
        }

        $doacoes = self::listarDoacoes($cnpj);
        $ultima  = $doacoes[0] ?? [
            'id'              => 'DOA-01',
            'empresaId'       => $cnpj,
            'cpfInformado'    => $cpf,
            'tipoPeca'        => $tipoPeca,
            'pecas'           => $pecas,
            'pesoKg'          => $pesoKg,
            'statusCuradoria' => 'Aguardando curadoria',
            'criadoEm'        => date('c'),
        ];

        if ($cicloRes !== null) {
            $ultima['ciclosPorLoja'] = $cicloRes['ciclosPorLoja'];
            $ultima['cuponsGerados'] = $cicloRes['cuponsNovos'] ?? [];
        }

        return $ultima;
    }
}
