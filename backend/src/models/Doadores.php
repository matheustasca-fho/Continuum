<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/Enderecos.php';
require_once __DIR__ . '/Notificacoes.php';

class Doadores {

    private const SELECT_BASE = "
        SELECT d.CPF,
               d.CEP,
               d.SENHA_DOADOR,
               d.NM_DOADOR,
               d.TELEFONE,
               d.NR_DOACOES,
               d.NR_ENDERECO,
               d.DS_COMPLEMENTO,
               d.FAIXA_ETARIA,
               d.CANAL_AQUISICAO,
               d.EMAIL_DOADOR,
               d.CELULAR,
               c.LOGRADOURO,
               b.NM_BAIRRO AS BAIRRO,
               cid.NM_CIDADE AS CIDADE,
               est.SG_ESTADO AS UF
          FROM DOADOR d
          LEFT JOIN CEP c ON TRIM(c.CEP) = TRIM(d.CEP)
          LEFT JOIN BAIRRO b ON b.ID_BAIRRO = c.ID_BAIRRO
          LEFT JOIN CIDADE cid ON cid.ID_CIDADE = b.CD_CIDADE
          LEFT JOIN ESTADO est ON est.ID_ESTADO = cid.ID_ESTADO
    ";

    public static function formatar(array $row): array {
        $cpf = trim($row['CPF'] ?? '');
        $state = Auth::getState();
        $meta  = $state['doadoresMeta'][$cpf] ?? [];
        return [
            'id'                        => $cpf,
            'cpf'                       => $cpf,
            'usuario'                   => $row['EMAIL_DOADOR'] ?? $cpf,
            'nome'                      => $row['NM_DOADOR'] ?? '',
            'email'                     => $row['EMAIL_DOADOR'] ?? '',
            'telefone'                  => $row['TELEFONE'] ?? '',
            'cep'                       => trim($row['CEP'] ?? ''),
            'uf'                        => $row['UF'] ?: ($meta['uf'] ?? 'SP'),
            'cidade'                    => $row['CIDADE'] ?: ($meta['cidade'] ?? 'São Paulo'),
            'bairro'                    => $row['BAIRRO'] ?: ($meta['bairro'] ?? ''),
            'logradouro'                => $row['LOGRADOURO'] ?: ($meta['logradouro'] ?? ''),
            'numero'                    => $row['NR_ENDERECO'] ?? '',
            'complemento'               => $row['DS_COMPLEMENTO'] ?? '',
            'faixaEtaria'               => $row['FAIXA_ETARIA'] ?? '',
            'comoConheceu'              => $row['CANAL_AQUISICAO'] ?? '',
            'frequenciaDisponibilidade' => $meta['frequenciaDisponibilidade'] ?? 'mensal',
            'volumeMensalKg'            => (float)($meta['volumeMensalKg'] ?? 0),
            'tiposResiduo'              => $meta['tiposResiduo'] ?? [],
            'foto'                      => $meta['foto'] ?? '',
            'nrDoacoes'                 => (int)($row['NR_DOACOES'] ?? 0),
        ];
    }

    public static function buscarPorCpfOuEmail(string $identificador): ?array {
        $conn = Database::getConnection();
        $digits = Auth::onlyDigits($identificador);
        $lower  = Auth::norm($identificador);

        if ($lower === 'doador') {
            $stmt = oci_parse($conn, self::SELECT_BASE . " FETCH FIRST 1 ROWS ONLY");
            oci_execute($stmt);
            $row = oci_fetch_assoc($stmt);
            oci_free_statement($stmt);
            return $row ?: null;
        }

        $sql = self::SELECT_BASE . " WHERE TRIM(d.CPF) = :cpf OR LOWER(TRIM(d.EMAIL_DOADOR)) = :email";
        $stmt = oci_parse($conn, $sql);
        $cpfBind = strlen($digits) === 11 ? $digits : '__NONE__';
        oci_bind_by_name($stmt, ':cpf', $cpfBind);
        oci_bind_by_name($stmt, ':email', $lower);
        oci_execute($stmt);
        $row = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        return $row ?: null;
    }

    public static function obterPorCpf(string $cpf): ?array {
        $digits = Auth::onlyDigits($cpf);
        if ($digits === '') {
            return null;
        }
        $conn = Database::getConnection();
        $sql = self::SELECT_BASE . " WHERE TRIM(d.CPF) = :cpf";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':cpf', $digits);
        oci_execute($stmt);
        $row = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        return $row ? self::formatar($row) : null;
    }

    public static function buscar(array $params): ?array {
        $termo = trim((string)($params['cpf'] ?? $params['email'] ?? $params['busca'] ?? $params['q'] ?? ''));
        if ($termo === '') {
            return null;
        }
        $row = self::buscarPorCpfOuEmail($termo);
        return $row ? self::formatar($row) : null;
    }

    public static function obterAtual(): ?array {
        $sessao = Auth::getSessao('doador');
        $cpfSessao = $sessao['usuario']['cpf'] ?? $sessao['usuario']['id'] ?? null;
        if ($cpfSessao) {
            $found = self::obterPorCpf((string)$cpfSessao);
            if ($found) {
                return $found;
            }
        }

        $conn = Database::getConnection();
        $stmt = oci_parse($conn, self::SELECT_BASE . " ORDER BY d.CPF FETCH FIRST 1 ROWS ONLY");
        oci_execute($stmt);
        $row = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        return $row ? self::formatar($row) : null;
    }

    public static function registrar(array $dados): array {
        if (
            (array_key_exists('termosAceitos', $dados) && empty($dados['termosAceitos'])) ||
            (array_key_exists('aceiteTermos', $dados) && empty($dados['aceiteTermos']))
        ) {
            throw new InvalidArgumentException('É obrigatório aceitar os termos de uso para se cadastrar.');
        }

        $cpf = Auth::onlyDigits($dados['cpf'] ?? '');
        $nome     = trim((string)($dados['nome'] ?? ''));
        $email    = trim((string)($dados['email'] ?? ''));
        $telefone = substr(Auth::onlyDigits($dados['telefone'] ?? ''), 0, 11);
        $senha    = (string)($dados['senha'] ?? $dados['senhaHash'] ?? '');

        if ($cpf !== '' && (Auth::documentoExisteEmDoadorOuDesigner($cpf) || ($email !== '' && Auth::emailExisteEmQualquerPerfil($email)))) {
            throw new RuntimeException('Já existe um cadastro com este e-mail ou CPF em outro perfil.');
        }

        if (!Auth::cpfValido($cpf)) {
            throw new InvalidArgumentException('Informe um CPF válido.');
        }

        if ($nome === '' || $email === '' || $telefone === '' || $senha === '') {
            throw new InvalidArgumentException('Nome, CPF, e-mail, telefone e senha são obrigatórios.');
        }

        $cep = Enderecos::garantirCep(
            (string)($dados['cep'] ?? ''),
            (string)($dados['logradouro'] ?? ''),
            (string)($dados['bairro'] ?? ''),
            (string)($dados['cidade'] ?? 'São Paulo'),
            (string)($dados['uf'] ?? 'SP')
        );

        $nmDoador    = mb_substr($nome, 0, 30);
        $hashSenha   = password_hash($senha, PASSWORD_BCRYPT);
        $nrEndereco  = mb_substr(trim((string)($dados['numero'] ?? '')), 0, 3);
        $complemento = mb_substr(trim((string)($dados['complemento'] ?? '')), 0, 100);
        $faixaEtaria = mb_substr(trim((string)($dados['faixaEtaria'] ?? '')), 0, 20);
        $canal       = mb_substr(trim((string)($dados['comoConheceu'] ?? '')), 0, 50);
        $emailTrunc  = mb_substr($email, 0, 150);
        $nrDoacoes   = 0;

        $conn = Database::getConnection();
        $sql = "INSERT INTO DOADOR (
                    CPF, CEP, SENHA_DOADOR, NM_DOADOR, TELEFONE, NR_DOACOES,
                    NR_ENDERECO, DS_COMPLEMENTO, FAIXA_ETARIA, CANAL_AQUISICAO, EMAIL_DOADOR
                ) VALUES (
                    :cpf, :cep, :senha, :nome, :tel, :nrDoacoes,
                    :numero, :compl, :faixa, :canal, :email
                )";

        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':cpf', $cpf);
        oci_bind_by_name($stmt, ':cep', $cep);
        oci_bind_by_name($stmt, ':senha', $hashSenha);
        oci_bind_by_name($stmt, ':nome', $nmDoador);
        oci_bind_by_name($stmt, ':tel', $telefone);
        oci_bind_by_name($stmt, ':nrDoacoes', $nrDoacoes);
        oci_bind_by_name($stmt, ':numero', $nrEndereco);
        oci_bind_by_name($stmt, ':compl', $complemento);
        oci_bind_by_name($stmt, ':faixa', $faixaEtaria);
        oci_bind_by_name($stmt, ':canal', $canal);
        oci_bind_by_name($stmt, ':email', $emailTrunc);

        $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$ok) {
            $err = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($err['message'] ?? 'Erro ao cadastrar doador.');
        }
        oci_free_statement($stmt);

        // Vincula automaticamente todas as doações anteriores feitas neste CPF e gera cupons devidos (BE-20.6)
        self::processarCiclosECupons($cpf);

        return self::obterPorCpf($cpf) ?? [
            'id'    => $cpf,
            'cpf'   => $cpf,
            'nome'  => $nome,
            'email' => $email,
        ];
    }

    public static function atualizarPerfil(string $cpfParam, array $dados): array {
        if (array_key_exists('cpf', $dados)) {
            $cpfBody = Auth::onlyDigits($dados['cpf']);
            $cpfUrl  = Auth::onlyDigits($cpfParam);
            if ($cpfUrl !== '' && $cpfBody !== '' && $cpfBody !== $cpfUrl) {
                throw new InvalidArgumentException('O CPF não pode ser alterado após o cadastro.');
            }
        }
        if (isset($dados['foto'])) {
            Auth::validarFoto($dados['foto']);
        }

        $cpf = Auth::onlyDigits($cpfParam ?: ($dados['cpf'] ?? ''));
        $atual = $cpf !== '' ? self::obterPorCpf($cpf) : null;
        if (!$atual) {
            $atual = self::obterAtual();
        }
        if (!$atual) {
            throw new RuntimeException('Doador não encontrado.');
        }
        $cpf = $atual['cpf'];

        if (!empty($dados['email']) && Auth::norm($dados['email']) !== Auth::norm($atual['email'])) {
            if (Auth::emailExisteEmQualquerPerfil($dados['email'], $cpf)) {
                throw new RuntimeException('Este e-mail já está em uso.');
            }
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

        $nome        = mb_substr(trim((string)($dados['nome'] ?? $atual['nome'])), 0, 30);
        $email       = mb_substr(trim((string)($dados['email'] ?? $atual['email'])), 0, 150);
        $telefone    = substr(Auth::onlyDigits($dados['telefone'] ?? $atual['telefone']), 0, 11) ?: $atual['telefone'];
        $numero      = mb_substr(trim((string)($dados['numero'] ?? $atual['numero'])), 0, 3);
        $complemento = mb_substr(trim((string)($dados['complemento'] ?? $atual['complemento'])), 0, 100);
        $faixa       = mb_substr(trim((string)($dados['faixaEtaria'] ?? $atual['faixaEtaria'])), 0, 20);
        $canal       = mb_substr(trim((string)($dados['comoConheceu'] ?? $atual['comoConheceu'])), 0, 50);

        $conn = Database::getConnection();
        $sql = "UPDATE DOADOR
                   SET NM_DOADOR       = :nome,
                       EMAIL_DOADOR    = :email,
                       TELEFONE        = :tel,
                       CEP             = :cep,
                       NR_ENDERECO     = :numero,
                       DS_COMPLEMENTO  = :compl,
                       FAIXA_ETARIA    = :faixa,
                       CANAL_AQUISICAO = :canal
                 WHERE TRIM(CPF) = :cpf";

        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':nome', $nome);
        oci_bind_by_name($stmt, ':email', $email);
        oci_bind_by_name($stmt, ':tel', $telefone);
        oci_bind_by_name($stmt, ':cep', $cep);
        oci_bind_by_name($stmt, ':numero', $numero);
        oci_bind_by_name($stmt, ':compl', $complemento);
        oci_bind_by_name($stmt, ':faixa', $faixa);
        oci_bind_by_name($stmt, ':canal', $canal);
        oci_bind_by_name($stmt, ':cpf', $cpf);

        $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$ok) {
            $err = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($err['message'] ?? 'Erro ao atualizar perfil do doador.');
        }
        oci_free_statement($stmt);

        $state = Auth::getState();
        $meta  = $state['doadoresMeta'][$cpf] ?? [];
        foreach (['frequenciaDisponibilidade', 'volumeMensalKg', 'tiposResiduo', 'foto', 'uf', 'cidade', 'bairro', 'logradouro'] as $k) {
            if (array_key_exists($k, $dados)) {
                $meta[$k] = $dados[$k];
            }
        }
        $state['doadoresMeta'][$cpf] = $meta;
        Auth::saveState($state);

        $atualizado = self::obterPorCpf($cpf);
        $sessao = Auth::getSessao('doador');
        if ($sessao && ($sessao['usuario']['cpf'] ?? '') === $cpf) {
            Auth::setSessao('doador', ['perfil' => 'doador', 'id' => $cpf, 'cpf' => $cpf, 'usuario' => $atualizado]);
        }

        return $atualizado;
    }

    /**
     * Motor de ciclo de 5 doações por loja em 6 meses e geração de cupom (BE-15 e BE-20)
     */
    public static function processarCiclosECupons(string $cpfParam): array {
        require_once __DIR__ . '/Empresas.php';
        $cpf = Auth::onlyDigits($cpfParam);
        if (strlen($cpf) !== 11) {
            return ['doacoes' => [], 'cupons' => [], 'ciclosPorLoja' => []];
        }

        $conn  = Database::getConnection();
        $state = Auth::getState();
        $doadorCadastrado = self::obterPorCpf($cpf) !== null;

        // Lê todas as doações do CPF na tabela DOACAO em ordem cronológica
        $sqlDoa = "SELECT ID_DOACAO, CNPJ_EMPRESA, ID_LOTE, CPF_INFORMADO, PESO_KG, DS_ITENS, ST_CURADORIA,
                          TO_CHAR(DT_DOACAO, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_ISO
                     FROM DOACAO
                    WHERE TRIM(CPF_INFORMADO) = :cpf
                    ORDER BY DT_DOACAO ASC, ID_DOACAO ASC";
        $stmt = oci_parse($conn, $sqlDoa);
        oci_bind_by_name($stmt, ':cpf', $cpf);
        oci_execute($stmt);

        $rows = [];
        while ($r = oci_fetch_assoc($stmt)) {
            $rows[] = $r;
        }
        oci_free_statement($stmt);

        $seisMesesSeg = 183 * 24 * 60 * 60;
        $agoraTs      = time();

        // Agrupa doações por empresa (loja)
        $porLoja = [];
        $doacoesFormatadas = [];

        foreach ($rows as $r) {
            $idDoacao = (int)$r['ID_DOACAO'];
            $cnpj     = trim($r['CNPJ_EMPRESA'] ?? '');
            $dtIso    = !empty($r['DT_ISO']) ? ($r['DT_ISO'] . 'Z') : date('c');
            $dtTs     = strtotime($dtIso) ?: $agoraTs;

            $dsRaw    = trim($r['DS_ITENS'] ?? '');
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

            $item = [
                'id'              => 'DOA-' . str_pad((string)$idDoacao, 2, '0', STR_PAD_LEFT),
                'idDoacao'        => $idDoacao,
                'empresaId'       => $cnpj,
                'idLote'          => !empty($r['ID_LOTE']) ? (string)$r['ID_LOTE'] : null,
                'cpfInformado'    => $cpf,
                'doadorId'        => $cpf,
                'pecas'           => $pecas,
                'pesoKg'          => (float)($r['PESO_KG'] ?? 1),
                'tipoPeca'        => $tipoPeca,
                'observacoes'     => $obs,
                'statusCuradoria' => ($r['ST_CURADORIA'] ?? '') === 'EM_LOTE' ? 'Em lote' : 'Aguardando curadoria',
                'statusContagem'  => 'CONTANDO',
                'criadoEm'        => $dtIso,
                '_ts'             => $dtTs,
            ];
            $porLoja[$cnpj][] = $item;
        }

        $cuponsGeradosCiclo = $state['cuponsMeta'][$cpf] ?? [];
        $ciclosPorLoja      = [];

        foreach ($porLoja as $cnpj => $listaLoja) {
            $emp = Empresas::obterPorId($cnpj);
            $nomeLoja = $emp['nomeFantasia'] ?? 'Empresa Parceira';
            $pctLoja  = (float)($emp['politicaCupom']['percentual'] ?? 15);
            $diasLoja = (int)($emp['politicaCupom']['validadeDias'] ?? 30);

            $cicloAtivo = [];
            $inicioCicloTs = null;

            foreach ($listaLoja as $doa) {
                $idD = $doa['idDoacao'];
                // Se a doação tem mais de 6 meses em relação a agora e ainda não fechou ciclo antes, expira (BE-20.3)
                if (($agoraTs - $doa['_ts']) > $seisMesesSeg) {
                    $doa['statusContagem'] = 'EXPIRADA';
                    $state['doacoesMeta'][(string)$idD]['statusContagem'] = 'EXPIRADA';
                    unset($doa['_ts']);
                    $doacoesFormatadas[$idD] = $doa;
                    continue;
                }

                // Se o ciclo atual já tinha começado há mais de 6 meses antes desta doação, expira as anteriores
                if ($inicioCicloTs !== null && ($doa['_ts'] - $inicioCicloTs) > $seisMesesSeg) {
                    foreach ($cicloAtivo as $antiga) {
                        $idAnt = $antiga['idDoacao'];
                        $antiga['statusContagem'] = 'EXPIRADA';
                        $state['doacoesMeta'][(string)$idAnt]['statusContagem'] = 'EXPIRADA';
                        unset($antiga['_ts']);
                        $doacoesFormatadas[$idAnt] = $antiga;
                    }
                    $cicloAtivo = [];
                    $inicioCicloTs = null;
                }

                if ($inicioCicloTs === null) {
                    $inicioCicloTs = $doa['_ts'];
                }
                $cicloAtivo[] = $doa;

                // Fechou 5 entregas na mesma loja dentro de 6 meses -> gera 1 cupom e marca as 5 como EM_CUPOM (BE-20.1)
                if (count($cicloAtivo) === 5) {
                    $idsCiclo = array_map(fn($x) => $x['idDoacao'], $cicloAtivo);
                    $chaveCiclo = $cnpj . ':' . implode('-', $idsCiclo);

                    foreach ($cicloAtivo as $cItem) {
                        $idC = $cItem['idDoacao'];
                        $cItem['statusContagem'] = 'EM_CUPOM';
                        $state['doacoesMeta'][(string)$idC]['statusContagem'] = 'EM_CUPOM';
                        unset($cItem['_ts']);
                        $doacoesFormatadas[$idC] = $cItem;
                    }

                    if (!isset($cuponsGeradosCiclo[$chaveCiclo])) {
                        // Verifica ou cria registro na tabela DESCONTO + DOADOR_DESCONTO se o doador já tiver conta
                        $idDesconto = null;
                        if ($doadorCadastrado) {
                            $idDesconto = self::materializarCupomNoBanco($cpf, $cnpj, $pctLoja, $diasLoja);
                        } else {
                            $idDesconto = 900 + count($cuponsGeradosCiclo) + 1;
                        }

                        $codigoCupom = 'CONT-' . str_pad((string)$idDesconto, 6, '0', STR_PAD_LEFT);
                        $cuponsGeradosCiclo[$chaveCiclo] = [
                            'id'               => 'CUP-' . $idDesconto,
                            'idDesconto'       => $idDesconto,
                            'chaveCiclo'       => $chaveCiclo,
                            'codigo'           => $codigoCupom,
                            'empresaId'        => $cnpj,
                            'empresaNome'      => $nomeLoja,
                            'cpfDoador'        => $cpf,
                            'doadorId'         => $cpf,
                            'percentual'       => $pctLoja,
                            'validade'         => date('Y-m-d', strtotime("+{$diasLoja} days")),
                            'status'           => 'Ativo',
                            'doacoesVinculadas'=> array_map(fn($id) => 'DOA-' . str_pad((string)$id, 2, '0', STR_PAD_LEFT), $idsCiclo),
                            'materializadoBd'  => $doadorCadastrado,
                            'criadoEm'         => date('c'),
                        ];

                        Notificacoes::registrar(
                            'CUPOM_GERADO',
                            'doador',
                            $cpf,
                            'Novo cupom de desconto liberado!',
                            "Você completou 5 doações na loja {$nomeLoja} e ganhou um cupom de {$pctLoja}% ({$codigoCupom}).",
                            $codigoCupom
                        );
                    } elseif ($doadorCadastrado && empty($cuponsGeradosCiclo[$chaveCiclo]['materializadoBd'])) {
                        // Doador acabou de se cadastrar (BE-20.6): grava o cupom pendente nas tabelas DESCONTO e DOADOR_DESCONTO
                        $cup = $cuponsGeradosCiclo[$chaveCiclo];
                        $idDesconto = self::materializarCupomNoBanco($cpf, $cnpj, (float)$cup['percentual'], 30);
                        $cuponsGeradosCiclo[$chaveCiclo]['id']              = 'CUP-' . $idDesconto;
                        $cuponsGeradosCiclo[$chaveCiclo]['idDesconto']      = $idDesconto;
                        $cuponsGeradosCiclo[$chaveCiclo]['codigo']          = 'CONT-' . str_pad((string)$idDesconto, 6, '0', STR_PAD_LEFT);
                        $cuponsGeradosCiclo[$chaveCiclo]['materializadoBd'] = true;
                    }

                    $cicloAtivo    = [];
                    $inicioCicloTs = null;
                }
            }

            // As doações que sobraram no ciclo ativo (< 5) continuam CONTANDO
            foreach ($cicloAtivo as $cItem) {
                $idC = $cItem['idDoacao'];
                $cItem['statusContagem'] = 'CONTANDO';
                $state['doacoesMeta'][(string)$idC]['statusContagem'] = 'CONTANDO';
                unset($cItem['_ts']);
                $doacoesFormatadas[$idC] = $cItem;
            }

            $ciclosPorLoja[$cnpj] = [
                'empresaId'        => $cnpj,
                'empresaNome'      => $nomeLoja,
                'doacoesNoCiclo'   => count($cicloAtivo),
                'metaCiclo'        => 5,
                'percentual'       => min(100, count($cicloAtivo) * 20),
                'inicioCiclo'      => $inicioCicloTs ? date('c', $inicioCicloTs) : null,
                'expiraCicloEm'    => $inicioCicloTs ? date('c', $inicioCicloTs + $seisMesesSeg) : null,
            ];
        }

        $state['cuponsMeta'][$cpf] = $cuponsGeradosCiclo;
        Auth::saveState($state);

        // Ordena doações da mais recente para a mais antiga
        krsort($doacoesFormatadas);

        return [
            'doacoes'       => array_values($doacoesFormatadas),
            'cuponsCiclo'   => array_values($cuponsGeradosCiclo),
            'ciclosPorLoja' => array_values($ciclosPorLoja),
        ];
    }

    private static function materializarCupomNoBanco(string $cpf, string $cnpj, float $percentual, int $validadeDias): int {
        $conn = Database::getConnection();
        $stmtMax = oci_parse($conn, "SELECT NVL(MAX(ID_DESCONTO), 10) + 1 AS NEXT_ID FROM DESCONTO");
        oci_execute($stmtMax);
        $idDesconto = (int)(oci_fetch_assoc($stmtMax)['NEXT_ID'] ?? 11);
        oci_free_statement($stmtMax);

        $insD = oci_parse($conn, "
            INSERT INTO DESCONTO (ID_DESCONTO, PORCENTAGEM, VALIDADE_CUPOM, CNPJ_EMPRESA)
            VALUES (:id, :pct, SYSTIMESTAMP + NUMTODSINTERVAL(:dias, 'DAY'), :cnpj)
        ");
        oci_bind_by_name($insD, ':id', $idDesconto);
        oci_bind_by_name($insD, ':pct', $percentual);
        oci_bind_by_name($insD, ':dias', $validadeDias);
        oci_bind_by_name($insD, ':cnpj', $cnpj);
        @oci_execute($insD, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($insD);

        $insDD = oci_parse($conn, "INSERT INTO DOADOR_DESCONTO (CPF, CD_DESCONTO) VALUES (:cpf, :id)");
        oci_bind_by_name($insDD, ':cpf', $cpf);
        oci_bind_by_name($insDD, ':id', $idDesconto);
        @oci_execute($insDD, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($insDD);

        return $idDesconto;
    }

    public static function obterEstatisticas(?string $cpfParam = null): array {
        $doador = $cpfParam ? self::obterPorCpf($cpfParam) : self::obterAtual();
        if (!$doador) {
            return ['doador' => null, 'doacoes' => [], 'cupons' => [], 'ciclosPorLoja' => [], 'indicadores' => []];
        }

        $cpf  = $doador['cpf'];
        $conn = Database::getConnection();

        $proc = self::processarCiclosECupons($cpf);
        $doacoes = $proc['doacoes'];
        $ciclosPorLoja = $proc['ciclosPorLoja'];

        // Fallback: se DOACAO estiver vazia mas NR_DOACOES > 0 (dados seed da tabela DOADOR)
        $nrDoacoes = (int)($doador['nrDoacoes'] ?? 0);
        if (empty($doacoes) && $nrDoacoes > 0) {
            $stmtEmp = oci_parse($conn, "SELECT CNPJ FROM DOADOR_EMPRESA WHERE TRIM(CPF) = :cpf");
            oci_bind_by_name($stmtEmp, ':cpf', $cpf);
            oci_execute($stmtEmp);
            $cnpjs = [];
            while ($er = oci_fetch_assoc($stmtEmp)) {
                $cnpjs[] = trim($er['CNPJ']);
            }
            oci_free_statement($stmtEmp);
            $defaultCnpj = $cnpjs[0] ?? '12345678000190';

            for ($i = 1; $i <= $nrDoacoes; $i++) {
                $doacoes[] = [
                    'id'              => 'DOA-' . str_pad((string)$i, 2, '0', STR_PAD_LEFT),
                    'empresaId'       => $cnpjs[($i - 1) % max(1, count($cnpjs))] ?? $defaultCnpj,
                    'cpfInformado'    => $cpf,
                    'doadorId'        => $cpf,
                    'pecas'           => 1,
                    'pesoKg'          => 1.5,
                    'statusCuradoria' => 'Em lote',
                    'statusContagem'  => 'CONTANDO',
                    'criadoEm'        => date('c'),
                ];
            }
        }

        // 2. Cupons (DOADOR_DESCONTO + DESCONTO + EMPRESA) + cupons do state
        $state = Auth::getState();
        $utilizados = $state['cuponsUtilizados'] ?? [];

        $cuponsMap = [];
        $sqlCup = "SELECT d.ID_DESCONTO,
                          d.PORCENTAGEM,
                          TO_CHAR(d.VALIDADE_CUPOM, 'YYYY-MM-DD') AS VALIDADE_ISO,
                          d.CNPJ_EMPRESA,
                          e.NM_FANTASIA
                     FROM DOADOR_DESCONTO dd
                     JOIN DESCONTO d ON d.ID_DESCONTO = dd.CD_DESCONTO
                     LEFT JOIN EMPRESA e ON TRIM(e.CNPJ) = TRIM(d.CNPJ_EMPRESA)
                    WHERE TRIM(dd.CPF) = :cpf
                    ORDER BY d.ID_DESCONTO";
        $stmt = oci_parse($conn, $sqlCup);
        oci_bind_by_name($stmt, ':cpf', $cpf);
        oci_execute($stmt);
        while ($r = oci_fetch_assoc($stmt)) {
            $idDesc = (int)$r['ID_DESCONTO'];
            $codigo = 'CONT-' . str_pad((string)$idDesc, 6, '0', STR_PAD_LEFT);
            $status = isset($utilizados[$codigo]) ? 'Utilizado' : 'Ativo';
            $cuponsMap[$codigo] = [
                'id'          => 'CUP-' . $idDesc,
                'codigo'      => $codigo,
                'empresaId'   => trim($r['CNPJ_EMPRESA'] ?? ''),
                'empresaNome' => $r['NM_FANTASIA'] ?? 'Empresa Parceira',
                'cpfDoador'   => $cpf,
                'doadorId'    => $cpf,
                'percentual'  => (float)($r['PORCENTAGEM'] ?? 15),
                'validade'    => $r['VALIDADE_ISO'] ?? date('Y-m-d', strtotime('+30 days')),
                'status'      => $status,
                'utilizadoEm' => $utilizados[$codigo] ?? null,
            ];
        }
        oci_free_statement($stmt);

        foreach ($proc['cuponsCiclo'] as $cCiclo) {
            $cod = $cCiclo['codigo'];
            $cCiclo['status']      = isset($utilizados[$cod]) ? 'Utilizado' : ($cCiclo['status'] ?? 'Ativo');
            $cCiclo['utilizadoEm'] = $utilizados[$cod] ?? null;
            $cuponsMap[$cod]       = array_merge($cuponsMap[$cod] ?? [], $cCiclo);
        }

        $totalKg = 0.0;
        $lojasSet = [];
        foreach ($doacoes as $d) {
            $totalKg += (float)($d['pesoKg'] ?? 0);
            if (!empty($d['empresaId'])) {
                $lojasSet[$d['empresaId']] = true;
            }
        }
        $aguaPoupada = round($totalKg * Auth::FATOR_AGUA_LITROS_POR_KG, 1);
        $co2Evitado  = round($totalKg * Auth::FATOR_CO2_KG_POR_KG, 1);

        return [
            'doador'        => $doador,
            'doacoes'       => $doacoes,
            'cupons'        => array_values($cuponsMap),
            'ciclosPorLoja' => $ciclosPorLoja,
            'indicadores'   => [
                'lotesDoados'       => count($doacoes),
                'kgReaproveitados'  => round($totalKg, 1),
                'designersApoiados' => count($lojasSet),
                'aguaPoupadaLitros' => $aguaPoupada,
                'co2EvitadoKg'      => $co2Evitado,
            ],
        ];
    }

    /**
     * Busca um cupom pelo código (ex: CONT-000001 ou CUP-1) — BE-15.4, BE-15.5, BE-15.6
     */
    public static function buscarCupomPorCodigo(string $codigoParam): ?array {
        $cod = strtoupper(trim($codigoParam));
        if ($cod === '') {
            return null;
        }
        $idNum = (int)preg_replace('/\D/', '', $cod);
        $codigoPadrao = $idNum > 0 ? ('CONT-' . str_pad((string)$idNum, 6, '0', STR_PAD_LEFT)) : $cod;

        $state = Auth::getState();
        $utilizados = $state['cuponsUtilizados'] ?? [];

        // 1. Procura nos cupons gerados em cuponsMeta
        foreach (($state['cuponsMeta'] ?? []) as $cpf => $lista) {
            foreach ($lista as $c) {
                if (strcasecmp($c['codigo'] ?? '', $codigoPadrao) === 0 || strcasecmp($c['id'] ?? '', $cod) === 0) {
                    $c['status']      = isset($utilizados[$c['codigo']]) ? 'Utilizado' : ($c['status'] ?? 'Ativo');
                    $c['utilizadoEm'] = $utilizados[$c['codigo']] ?? null;
                    return $c;
                }
            }
        }

        // 2. Procura na tabela DESCONTO do Oracle
        if ($idNum > 0) {
            $conn = Database::getConnection();
            $sql = "SELECT d.ID_DESCONTO, d.PORCENTAGEM, TO_CHAR(d.VALIDADE_CUPOM, 'YYYY-MM-DD') AS VALIDADE_ISO,
                           d.CNPJ_EMPRESA, e.NM_FANTASIA, dd.CPF
                      FROM DESCONTO d
                      LEFT JOIN DOADOR_DESCONTO dd ON dd.CD_DESCONTO = d.ID_DESCONTO
                      LEFT JOIN EMPRESA e ON TRIM(e.CNPJ) = TRIM(d.CNPJ_EMPRESA)
                     WHERE d.ID_DESCONTO = :id";
            $stmt = oci_parse($conn, $sql);
            oci_bind_by_name($stmt, ':id', $idNum);
            oci_execute($stmt);
            $r = oci_fetch_assoc($stmt);
            oci_free_statement($stmt);
            if ($r) {
                return [
                    'id'          => 'CUP-' . $idNum,
                    'codigo'      => $codigoPadrao,
                    'empresaId'   => trim($r['CNPJ_EMPRESA'] ?? ''),
                    'empresaNome' => $r['NM_FANTASIA'] ?? 'Empresa Parceira',
                    'cpfDoador'   => trim($r['CPF'] ?? ''),
                    'percentual'  => (float)($r['PORCENTAGEM'] ?? 15),
                    'validade'    => $r['VALIDADE_ISO'] ?? date('Y-m-d', strtotime('+30 days')),
                    'status'      => isset($utilizados[$codigoPadrao]) ? 'Utilizado' : 'Ativo',
                    'utilizadoEm' => $utilizados[$codigoPadrao] ?? null,
                ];
            }
        }

        return null;
    }

    /**
     * Marca um cupom como utilizado; recusa se já utilizado (BE-15.5, BE-15.6)
     */
    public static function utilizarCupom(string $codigoParam): array {
        $cupom = self::buscarCupomPorCodigo($codigoParam);
        if (!$cupom) {
            throw new RuntimeException('Cupom não encontrado.');
        }
        if (($cupom['status'] ?? '') === 'Utilizado') {
            throw new DomainException('Este cupom já foi utilizado anteriormente e não pode ser usado novamente.');
        }
        if (!empty($cupom['validade']) && strtotime($cupom['validade'] . ' 23:59:59') < time()) {
            throw new DomainException('Este cupom está expirado.');
        }

        $state = Auth::getState();
        $cod = $cupom['codigo'];
        $state['cuponsUtilizados'][$cod] = date('c');
        Auth::saveState($state);

        $cupom['status']      = 'Utilizado';
        $cupom['utilizadoEm'] = $state['cuponsUtilizados'][$cod];
        return $cupom;
    }

    /**
     * Remove/anonimiza CPFs não vinculados após o prazo de retenção de 6 meses (AN-17 / BE-20.7)
     */
    public static function limparCpfsNaoVinculados(): array {
        $conn = Database::getConnection();
        $sqlSelect = "
            SELECT ID_DOACAO, TRIM(CPF_INFORMADO) AS CPF
              FROM DOACAO d
             WHERE d.CPF_INFORMADO IS NOT NULL
               AND d.DT_DOACAO < (SYSTIMESTAMP - NUMTODSINTERVAL(183, 'DAY'))
               AND NOT EXISTS (
                   SELECT 1 FROM DOADOR doad WHERE TRIM(doad.CPF) = TRIM(d.CPF_INFORMADO)
               )
        ";
        $stmt = oci_parse($conn, $sqlSelect);
        oci_execute($stmt);
        $removidos = [];
        while ($r = oci_fetch_assoc($stmt)) {
            $idDoa = (int)$r['ID_DOACAO'];
            $removidos[] = ['idDoacao' => $idDoa, 'cpfRemovido' => $r['CPF']];
            $upd = oci_parse($conn, "UPDATE DOACAO SET CPF_INFORMADO = NULL WHERE ID_DOACAO = :id");
            oci_bind_by_name($upd, ':id', $idDoa);
            @oci_execute($upd, OCI_COMMIT_ON_SUCCESS);
            oci_free_statement($upd);
        }
        oci_free_statement($stmt);

        return [
            'quantidadeRemovida' => count($removidos),
            'registros'          => $removidos,
            'executadoEm'        => date('c'),
        ];
    }
}
