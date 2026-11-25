<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/Auth.php';

class Enderecos {

    private static function fallbacks(): array {
        return [
            '01310000' => [
                'logradouro' => 'Avenida Paulista',
                'bairro'     => 'Bela Vista',
                'localidade' => 'São Paulo',
                'uf'         => 'SP',
            ],
            '01311000' => [
                'logradouro' => 'Avenida Paulista',
                'bairro'     => 'Bela Vista',
                'localidade' => 'São Paulo',
                'uf'         => 'SP',
            ],
            '01310930' => [
                'logradouro' => 'Avenida Paulista',
                'bairro'     => 'Bela Vista',
                'localidade' => 'São Paulo',
                'uf'         => 'SP',
            ],
            '01001000' => [
                'logradouro' => 'Praça da Sé',
                'bairro'     => 'Centro',
                'localidade' => 'São Paulo',
                'uf'         => 'SP',
            ],
            '01415000' => [
                'logradouro' => 'Rua Oscar Freire',
                'bairro'     => 'Jardins',
                'localidade' => 'São Paulo',
                'uf'         => 'SP',
            ],
            '13024000' => [
                'logradouro' => 'Avenida Júlio de Mesquita',
                'bairro'     => 'Cambuí',
                'localidade' => 'Campinas',
                'uf'         => 'SP',
            ],
            '20040002' => [
                'logradouro' => 'Rua da Assembleia',
                'bairro'     => 'Centro',
                'localidade' => 'Rio de Janeiro',
                'uf'         => 'RJ',
            ],
        ];
    }

    public static function obterDoBanco(string $cep): ?array {
        $cepLimpo = substr(Auth::onlyDigits($cep), 0, 8);
        if (strlen($cepLimpo) !== 8) {
            return null;
        }

        $conn = Database::getConnection();
        $sql = "SELECT c.CEP,
                       c.LOGRADOURO,
                       b.NM_BAIRRO AS BAIRRO,
                       cid.NM_CIDADE AS CIDADE,
                       est.SG_ESTADO AS UF
                  FROM CEP c
                  LEFT JOIN BAIRRO b ON b.ID_BAIRRO = c.ID_BAIRRO
                  LEFT JOIN CIDADE cid ON cid.ID_CIDADE = b.CD_CIDADE
                  LEFT JOIN ESTADO est ON est.ID_ESTADO = cid.ID_ESTADO
                 WHERE TRIM(c.CEP) = :cep";

        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':cep', $cepLimpo);
        oci_execute($stmt);
        $row = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        if (!$row) {
            return null;
        }

        $fallbacks = self::fallbacks();
        $fb = $fallbacks[$cepLimpo] ?? null;
        $cidade = $row['CIDADE'] ?: ($fb['localidade'] ?? 'São Paulo');
        $uf     = $row['UF'] ?: ($fb['uf'] ?? 'SP');

        return [
            'cep'        => trim($row['CEP']),
            'logradouro' => $row['LOGRADOURO'] ?: ($fb['logradouro'] ?? ''),
            'bairro'     => $row['BAIRRO'] ?: ($fb['bairro'] ?? ''),
            'localidade' => $cidade,
            'cidade'     => $cidade,
            'uf'         => $uf,
        ];
    }

    public static function garantirCep(
        string $cep,
        string $logradouro = '',
        string $bairro = '',
        string $cidade = '',
        string $uf = 'SP'
    ): ?string {
        $cepLimpo = substr(Auth::onlyDigits($cep), 0, 8);
        if (strlen($cepLimpo) !== 8) {
            return null;
        }

        $conn = Database::getConnection();

        $fallbacks = self::fallbacks();
        if (isset($fallbacks[$cepLimpo])) {
            $fb = $fallbacks[$cepLimpo];
            $logradouro = $logradouro ?: $fb['logradouro'];
            $bairro     = $bairro ?: $fb['bairro'];
            $cidade     = $cidade ?: $fb['localidade'];
            $uf         = ($uf && $uf !== 'SP') ? $uf : $fb['uf'];
        }

        // Cadastro sem rua/bairro (ex.: só CEP) consulta o ViaCEP em vez de gravar placeholders
        if ($logradouro === '' || $bairro === '') {
            $via = self::consultarViaCep($cepLimpo);
            if ($via) {
                $logradouro = $logradouro ?: ($via['logradouro'] ?? '');
                $bairro     = $bairro ?: ($via['bairro'] ?? '');
                $cidade     = $cidade ?: ($via['localidade'] ?? '');
            }
        }

        $ufNorm     = strtoupper(substr(trim($uf ?: 'SP'), 0, 2)) ?: 'SP';
        $cidadeNorm = mb_substr(trim($cidade ?: 'São Paulo'), 0, 100);
        $bairroNorm = mb_substr(trim($bairro ?: 'Centro'), 0, 100);
        $logrNorm   = mb_substr(trim($logradouro ?: 'Logradouro'), 0, 150);

        // 1. Garante ESTADO
        $stmt = oci_parse($conn, "SELECT ID_ESTADO FROM ESTADO WHERE UPPER(TRIM(SG_ESTADO)) = :uf");
        oci_bind_by_name($stmt, ':uf', $ufNorm);
        oci_execute($stmt);
        $estRow = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        if ($estRow) {
            $idEstado = (int)$estRow['ID_ESTADO'];
        } else {
            $stmt = oci_parse($conn, "SELECT NVL(MAX(ID_ESTADO), 0) + 1 AS NEXT_ID FROM ESTADO");
            oci_execute($stmt);
            $idEstado = (int)(oci_fetch_assoc($stmt)['NEXT_ID'] ?? 1);
            oci_free_statement($stmt);

            $ins = oci_parse($conn, "INSERT INTO ESTADO (ID_ESTADO, NM_ESTADO, SG_ESTADO) VALUES (:id, :nm, :sg)");
            oci_bind_by_name($ins, ':id', $idEstado);
            oci_bind_by_name($ins, ':nm', $ufNorm);
            oci_bind_by_name($ins, ':sg', $ufNorm);
            @oci_execute($ins, OCI_COMMIT_ON_SUCCESS);
            oci_free_statement($ins);
        }

        // 2. Garante CIDADE
        $stmt = oci_parse($conn, "SELECT ID_CIDADE FROM CIDADE WHERE UPPER(TRIM(NM_CIDADE)) = UPPER(:cid) AND ID_ESTADO = :est");
        oci_bind_by_name($stmt, ':cid', $cidadeNorm);
        oci_bind_by_name($stmt, ':est', $idEstado);
        oci_execute($stmt);
        $cidRow = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        if ($cidRow) {
            $idCidade = (int)$cidRow['ID_CIDADE'];
        } else {
            $stmt = oci_parse($conn, "SELECT NVL(MAX(ID_CIDADE), 100) + 1 AS NEXT_ID FROM CIDADE");
            oci_execute($stmt);
            $idCidade = (int)(oci_fetch_assoc($stmt)['NEXT_ID'] ?? 101);
            oci_free_statement($stmt);

            $ins = oci_parse($conn, "INSERT INTO CIDADE (ID_CIDADE, NM_CIDADE, ID_ESTADO) VALUES (:id, :nm, :est)");
            oci_bind_by_name($ins, ':id', $idCidade);
            oci_bind_by_name($ins, ':nm', $cidadeNorm);
            oci_bind_by_name($ins, ':est', $idEstado);
            @oci_execute($ins, OCI_COMMIT_ON_SUCCESS);
            oci_free_statement($ins);
        }

        // 3. Garante BAIRRO
        $stmt = oci_parse($conn, "SELECT ID_BAIRRO FROM BAIRRO WHERE UPPER(TRIM(NM_BAIRRO)) = UPPER(:bai) AND CD_CIDADE = :cid");
        oci_bind_by_name($stmt, ':bai', $bairroNorm);
        oci_bind_by_name($stmt, ':cid', $idCidade);
        oci_execute($stmt);
        $baiRow = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        if ($baiRow) {
            $idBairro = (int)$baiRow['ID_BAIRRO'];
        } else {
            $stmt = oci_parse($conn, "SELECT NVL(MAX(ID_BAIRRO), 1000) + 1 AS NEXT_ID FROM BAIRRO");
            oci_execute($stmt);
            $idBairro = (int)(oci_fetch_assoc($stmt)['NEXT_ID'] ?? 1001);
            oci_free_statement($stmt);

            $ins = oci_parse($conn, "INSERT INTO BAIRRO (ID_BAIRRO, NM_BAIRRO, CD_CIDADE) VALUES (:id, :nm, :cid)");
            oci_bind_by_name($ins, ':id', $idBairro);
            oci_bind_by_name($ins, ':nm', $bairroNorm);
            oci_bind_by_name($ins, ':cid', $idCidade);
            @oci_execute($ins, OCI_COMMIT_ON_SUCCESS);
            oci_free_statement($ins);
        }

        // Verifica se o CEP já está cadastrado
        $sqlCheck = "SELECT CEP, LOGRADOURO, ID_BAIRRO FROM CEP WHERE TRIM(CEP) = :cep";
        $stmt = oci_parse($conn, $sqlCheck);
        oci_bind_by_name($stmt, ':cep', $cepLimpo);
        oci_execute($stmt);
        $existing = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        if ($existing) {
            if ((int)($existing['ID_BAIRRO'] ?? 0) !== $idBairro || empty($existing['LOGRADOURO'])) {
                $upd = oci_parse($conn, "UPDATE CEP SET LOGRADOURO = :logr, ID_BAIRRO = :bai WHERE TRIM(CEP) = :cep");
                oci_bind_by_name($upd, ':logr', $logrNorm);
                oci_bind_by_name($upd, ':bai', $idBairro);
                oci_bind_by_name($upd, ':cep', $cepLimpo);
                @oci_execute($upd, OCI_COMMIT_ON_SUCCESS);
                oci_free_statement($upd);
            }
            return $cepLimpo;
        }

        // 4. Insere CEP
        $ins = oci_parse($conn, "INSERT INTO CEP (CEP, LOGRADOURO, ID_BAIRRO) VALUES (:cep, :logr, :bai)");
        oci_bind_by_name($ins, ':cep', $cepLimpo);
        oci_bind_by_name($ins, ':logr', $logrNorm);
        oci_bind_by_name($ins, ':bai', $idBairro);
        @oci_execute($ins, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($ins);

        return $cepLimpo;
    }

    /** Consulta o ViaCEP sem gravar nada no banco. Retorna null se indisponível ou CEP inexistente. */
    private static function consultarViaCep(string $cepLimpo): ?array {
        if (!function_exists('curl_init')) {
            return null;
        }
        $ch = curl_init("https://viacep.com.br/ws/{$cepLimpo}/json/");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 4,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT      => 'Continuum-App/1.0',
        ]);
        $resp = @curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!$resp || $code !== 200) {
            return null;
        }
        $json = json_decode($resp, true);
        return (is_array($json) && empty($json['erro'])) ? $json : null;
    }

    public static function buscarCep(string $cep): ?array {
        $cepLimpo = substr(Auth::onlyDigits($cep), 0, 8);
        if (strlen($cepLimpo) !== 8) {
            return null;
        }

        // 1. Tenta no banco Oracle primeiro
        $doBanco = self::obterDoBanco($cepLimpo);
        if ($doBanco !== null) {
            return $doBanco;
        }

        // 2. Tenta consultar ViaCEP
        $json = self::consultarViaCep($cepLimpo);
        if ($json) {
            $logr = $json['logradouro'] ?? '';
            $bai  = $json['bairro'] ?? '';
            $loc  = $json['localidade'] ?? 'São Paulo';
            $uf   = $json['uf'] ?? 'SP';
            self::garantirCep($cepLimpo, $logr, $bai, $loc, $uf);
            return [
                'cep'        => $cepLimpo,
                'logradouro' => $logr,
                'bairro'     => $bai,
                'localidade' => $loc,
                'cidade'     => $loc,
                'uf'         => $uf,
            ];
        }

        // 3. Fallback local
        $fallbacks = self::fallbacks();
        if (isset($fallbacks[$cepLimpo])) {
            $fb = $fallbacks[$cepLimpo];
            self::garantirCep($cepLimpo, $fb['logradouro'], $fb['bairro'], $fb['localidade'], $fb['uf']);
            return [
                'cep'        => $cepLimpo,
                'logradouro' => $fb['logradouro'],
                'bairro'     => $fb['bairro'],
                'localidade' => $fb['localidade'],
                'cidade'     => $fb['localidade'],
                'uf'         => $fb['uf'],
            ];
        }

        return null;
    }
}
