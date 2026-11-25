<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/Enderecos.php';

class Designers {

    private const SELECT_BASE = "
        SELECT cf.CPF_CNPJ,
               cf.SENHA_CONFECCIONISTA,
               cf.NM_CONFECCIONISTA,
               cf.CEP,
               cf.NR_ENDERECO,
               cf.DS_COMPLEMENTO,
               cf.DS_SOBRE_MIM,
               cf.RAZAO_SOCIAL,
               cf.COMPLEMENTO,
               cf.FAIXA_EXPERIENCIA,
               cf.MANIFESTO,
               cf.PORTFOLIO_URL,
               cf.INSTAGRAM,
               cf.SITE_URL,
               cf.CONSENTIMENTO_PERFIL_PUBLICO,
               cf.EMAIL_CONF,
               cf.\"CANAL_AQUISIÇÃO\" AS CANAL_AQUISICAO,
               cf.TEMPO_EXPERIENCIA,
               c.LOGRADOURO,
               b.NM_BAIRRO AS BAIRRO,
               cid.NM_CIDADE AS CIDADE,
               est.SG_ESTADO AS UF
          FROM CONFECCIONISTA cf
          LEFT JOIN CEP c ON TRIM(c.CEP) = TRIM(cf.CEP)
          LEFT JOIN BAIRRO b ON b.ID_BAIRRO = c.ID_BAIRRO
          LEFT JOIN CIDADE cid ON cid.ID_CIDADE = b.CD_CIDADE
          LEFT JOIN ESTADO est ON est.ID_ESTADO = cid.ID_ESTADO
    ";

    public static function extrairDocumento(string $idOrDoc): string {
        $clean = preg_replace('/^DSG-/i', '', trim($idOrDoc));
        return Auth::onlyDigits($clean);
    }

    public static function formatar(array $row, ?bool $incluirDadosInternosEmpresa = null): array {
        $doc = trim($row['CPF_CNPJ'] ?? '');
        $digits = Auth::onlyDigits($doc);
        $tipoPessoa = strlen($digits) > 11 ? 'PJ' : 'PF';

        $state = Auth::getState();
        $meta  = $state['designersMeta'][$digits] ?? [];

        if (!empty($row['COMPLEMENTO']) && strpos(trim($row['COMPLEMENTO']), '{') === 0) {
            $parsed = json_decode($row['COMPLEMENTO'], true);
            if (is_array($parsed)) {
                $meta = array_merge($parsed, $meta);
            }
        }

        $favoritos = $state['favoritos'][$digits] ?? [];

        // Verifica se existe lote reservado ativo para este designer
        $reservaAtiva = null;
        foreach (($state['lotesMeta'] ?? []) as $cdLote => $lMeta) {
            if (($lMeta['designerId'] ?? '') === $digits && ($lMeta['status'] ?? '') === 'RESERVADO') {
                $reservaAtiva = (string)$cdLote;
                break;
            }
        }

        $nome = $row['NM_CONFECCIONISTA'] ?? '';
        $portfolio = $row['PORTFOLIO_URL'] ?? $row['SITE_URL'] ?? '';
        $site      = $row['SITE_URL'] ?? $row['PORTFOLIO_URL'] ?? '';

        $cepVal = trim($row['CEP'] ?? '');
        $ufBanco = $row['UF'] ?? '';
        if ($cepVal === '20040002') {
            $ufEfetiva = 'RJ';
            $cidadeEfetiva = 'Rio de Janeiro';
        } else {
            $ufEfetiva = $meta['uf'] ?? ($ufBanco ?: 'SP');
            $cidadeEfetiva = $meta['cidade'] ?? ($row['CIDADE'] ?: 'São Paulo');
        }

        $payload = [
            'id'                         => $digits ?: $doc,
            'cpfCnpj'                    => $digits ?: $doc,
            'documento'                  => $digits ?: $doc,
            'usuario'                    => $row['EMAIL_CONF'] ?: ($digits ?: $doc),
            'tipoPessoa'                 => $tipoPessoa,
            'nome'                       => $nome,
            'nomeProfissional'           => $meta['nomeProfissional'] ?? $nome,
            'razaoSocial'                => $row['RAZAO_SOCIAL'] ?? '',
            'email'                      => $row['EMAIL_CONF'] ?? '',
            'telefone'                   => $meta['telefone'] ?? '',
            'cep'                        => $cepVal,
            'logradouro'                 => $row['LOGRADOURO'] ?: ($meta['logradouro'] ?? ''),
            'numero'                     => $row['NR_ENDERECO'] ?? '',
            'complemento'                => $row['DS_COMPLEMENTO'] ?? '',
            'bairro'                     => $row['BAIRRO'] ?: ($meta['bairro'] ?? ''),
            'cidade'                     => $cidadeEfetiva,
            'uf'                         => $ufEfetiva,
            'sobreMim'                   => $row['DS_SOBRE_MIM'] ?? '',
            'manifesto'                  => $row['MANIFESTO'] ?? '',
            'portfolio'                  => $portfolio,
            'site'                       => $site,
            'instagram'                  => $row['INSTAGRAM'] ?? '',
            'faixaExperiencia'           => $row['FAIXA_EXPERIENCIA'] ?? $row['TEMPO_EXPERIENCIA'] ?? '',
            'capacidadeProducao'         => $meta['capacidadeProducao'] ?? 10,
            'foto'                       => $meta['foto'] ?? '',
            'comoConheceu'               => $row['CANAL_AQUISICAO'] ?? '',
            'especialidades'             => $meta['especialidades'] ?? [],
            'consentimentoPerfilPublico' => ((int)($row['CONSENTIMENTO_PERFIL_PUBLICO'] ?? 0)) === 1,
            'consentimentoUsoImagem'     => (bool)($meta['consentimentoUsoImagem'] ?? (((int)($row['CONSENTIMENTO_PERFIL_PUBLICO'] ?? 0)) === 1)),
            'maioridadeConfirmada'       => true,
            'reservaAtiva'               => $reservaAtiva,
            'favoritos'                  => array_values(array_map('strval', $favoritos)),
        ];

        // Regra BE-19.6 e BE-19.7: O designer NUNCA vê a própria nota interna ou marca de restrição; apenas a empresa vê!
        if ($incluirDadosInternosEmpresa === null) {
            $sessao = Auth::obterSessaoRequisicao();
            $incluirDadosInternosEmpresa = (($sessao['perfil'] ?? '') === 'empresa');
        }
        if ($incluirDadosInternosEmpresa) {
            $payload['nota']           = (float)($meta['nota'] ?? 5.0);
            $payload['restricaoAtiva'] = (bool)($meta['restricaoAtiva'] ?? false);
        }

        return $payload;
    }

    public static function obterDadosInternosParaEmpresa(string $id): array {
        $digits = self::extrairDocumento($id);
        $state  = Auth::getState();
        $meta   = $state['designersMeta'][$digits] ?? [];
        return [
            'nota'           => (float)($meta['nota'] ?? 5.0),
            'restricaoAtiva' => (bool)($meta['restricaoAtiva'] ?? false),
        ];
    }

    public static function buscarPorDocumentoOuEmail(string $identificador): ?array {
        $conn   = Database::getConnection();
        $digits = self::extrairDocumento($identificador);
        $lower  = Auth::norm($identificador);

        $sql = self::SELECT_BASE . " WHERE TRIM(cf.CPF_CNPJ) = :doc OR LOWER(TRIM(cf.EMAIL_CONF)) = :email";
        $stmt = oci_parse($conn, $sql);
        $docBind = (strlen($digits) === 11 || strlen($digits) === 14) ? $digits : '__NONE__';
        oci_bind_by_name($stmt, ':doc', $docBind);
        oci_bind_by_name($stmt, ':email', $lower);
        oci_execute($stmt);
        $row = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        return $row ?: null;
    }

    public static function obterPorId(string $id, ?bool $visaoEmpresa = null): ?array {
        $digits = self::extrairDocumento($id);
        if ($digits === '') {
            return null;
        }

        $conn = Database::getConnection();
        $sql = self::SELECT_BASE . " WHERE TRIM(cf.CPF_CNPJ) = :doc";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':doc', $digits);
        oci_execute($stmt);
        $row = oci_fetch_assoc($stmt);
        oci_free_statement($stmt);

        return $row ? self::formatar($row, $visaoEmpresa) : null;
    }

    public static function obterAtual(?bool $visaoEmpresa = false): ?array {
        $sessao = Auth::getSessao('designer');
        $idSessao = $sessao['usuario']['documento'] ?? $sessao['usuario']['id'] ?? $sessao['id'] ?? null;
        if ($idSessao) {
            $found = self::obterPorId((string)$idSessao, $visaoEmpresa);
            if ($found) {
                return $found;
            }
        }

        return null; // sem sessão de designer não há designer "atual"
    }

    public static function registrar(array $dados): array {
        if (
            (array_key_exists('termosAceitos', $dados) && empty($dados['termosAceitos'])) ||
            (array_key_exists('aceiteTermos', $dados) && empty($dados['aceiteTermos']))
        ) {
            throw new InvalidArgumentException('É obrigatório aceitar os termos de uso para se cadastrar.');
        }

        $tipoPessoa = strtoupper(trim((string)($dados['tipoPessoa'] ?? 'PF')));
        $isPF       = $tipoPessoa !== 'PJ';
        $doc        = Auth::onlyDigits($dados['documento'] ?? $dados['cpfCnpj'] ?? '');

        if ($isPF && !Auth::cpfValido($doc)) {
            throw new InvalidArgumentException('CPF ou CNPJ inválido.');
        }
        if (!$isPF && !Auth::cnpjValido($doc)) {
            throw new InvalidArgumentException('CPF ou CNPJ inválido.');
        }

        $razaoSocial = trim((string)($dados['razaoSocial'] ?? ''));
        if (!$isPF && $razaoSocial === '') {
            throw new InvalidArgumentException('Razão social é obrigatória para pessoa jurídica.');
        }

        if (isset($dados['maioridadeConfirmada']) && !$dados['maioridadeConfirmada']) {
            throw new InvalidArgumentException('É necessário confirmar maioridade para se cadastrar.');
        }

        $nome     = trim((string)($dados['nome'] ?? $dados['nomeProfissional'] ?? ''));
        $nomeProf = trim((string)($dados['nomeProfissional'] ?? $nome));
        $email    = trim((string)($dados['email'] ?? ''));
        $telefone = Auth::onlyDigits($dados['telefone'] ?? '');
        $senha    = (string)($dados['senha'] ?? $dados['senhaHash'] ?? '');
        $cepDigits = Auth::onlyDigits($dados['cep'] ?? '');

        if ($nome === '' || $email === '' || $senha === '' || strlen($cepDigits) !== 8) {
            throw new InvalidArgumentException('Nome, documento, e-mail, CEP válido e senha são obrigatórios.');
        }
        if (array_key_exists('numero', $dados) && trim((string)$dados['numero']) === '') {
            throw new InvalidArgumentException('O número do endereço é obrigatório.');
        }

        if (Auth::documentoExisteEmDoadorOuDesigner($doc) || Auth::emailExisteEmQualquerPerfil($email)) {
            throw new RuntimeException('Já existe cadastro com este e-mail ou documento.');
        }

        $ufIn     = strtoupper(trim((string)($dados['uf'] ?? ($cepDigits === '20040002' ? 'RJ' : 'SP'))));
        $cidadeIn = trim((string)($dados['cidade'] ?? ($cepDigits === '20040002' ? 'Rio de Janeiro' : 'São Paulo')));
        $cep = Enderecos::garantirCep(
            $cepDigits,
            (string)($dados['logradouro'] ?? ''),
            (string)($dados['bairro'] ?? ''),
            $cidadeIn,
            $ufIn
        );

        $nmConf      = mb_substr($nomeProf ?: $nome, 0, 150);
        $hashSenha   = password_hash($senha, PASSWORD_BCRYPT);
        $nrEndereco  = mb_substr(trim((string)($dados['numero'] ?? '100')), 0, 4);
        $dsCompl     = mb_substr(trim((string)($dados['complemento'] ?? '')), 0, 100);
        $sobreMim    = mb_substr(trim((string)($dados['sobreMim'] ?? '')), 0, 500);
        $razaoTrunc  = mb_substr($razaoSocial, 0, 150);
        $faixaExp    = mb_substr(trim((string)($dados['faixaExperiencia'] ?? '')), 0, 50);
        $manifesto   = mb_substr(trim((string)($dados['manifesto'] ?? '')), 0, 1000);
        $portfolio   = mb_substr(trim((string)($dados['portfolio'] ?? '')), 0, 500);
        $instagram   = mb_substr(trim((string)($dados['instagram'] ?? '')), 0, 100);
        $siteUrl     = mb_substr(trim((string)($dados['site'] ?? $portfolio)), 0, 500);
        $consentPub  = !empty($dados['consentimentoPerfilPublico']) ? 1 : 0;
        $emailTrunc  = mb_substr($email, 0, 150);
        $canal       = mb_substr(trim((string)($dados['comoConheceu'] ?? '')), 0, 50);
        $especialidades = is_array($dados['especialidades'] ?? null) ? array_values($dados['especialidades']) : [];
        $metaJson    = mb_substr(json_encode(['telefone' => $telefone, 'uf' => $ufIn], JSON_UNESCAPED_UNICODE), 0, 100);

        $conn = Database::getConnection();
        $sql = "INSERT INTO CONFECCIONISTA (
                    CPF_CNPJ, SENHA_CONFECCIONISTA, NM_CONFECCIONISTA, CEP, NR_ENDERECO,
                    DS_COMPLEMENTO, DS_SOBRE_MIM, RAZAO_SOCIAL, COMPLEMENTO, FAIXA_EXPERIENCIA,
                    MANIFESTO, PORTFOLIO_URL, INSTAGRAM, SITE_URL, CONSENTIMENTO_PERFIL_PUBLICO,
                    EMAIL_CONF, \"CANAL_AQUISIÇÃO\"
                ) VALUES (
                    :doc, :senha, :nome, :cep, :numero,
                    :dsCompl, :sobreMim, :razao, :metaJson, :faixa,
                    :manifesto, :portfolio, :insta, :site, :consent,
                    :email, :canal
                )";

        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':doc', $doc);
        oci_bind_by_name($stmt, ':senha', $hashSenha);
        oci_bind_by_name($stmt, ':nome', $nmConf);
        oci_bind_by_name($stmt, ':cep', $cep);
        oci_bind_by_name($stmt, ':numero', $nrEndereco);
        oci_bind_by_name($stmt, ':dsCompl', $dsCompl);
        oci_bind_by_name($stmt, ':sobreMim', $sobreMim);
        oci_bind_by_name($stmt, ':razao', $razaoTrunc);
        oci_bind_by_name($stmt, ':metaJson', $metaJson);
        oci_bind_by_name($stmt, ':faixa', $faixaExp);
        oci_bind_by_name($stmt, ':manifesto', $manifesto);
        oci_bind_by_name($stmt, ':portfolio', $portfolio);
        oci_bind_by_name($stmt, ':insta', $instagram);
        oci_bind_by_name($stmt, ':site', $siteUrl);
        oci_bind_by_name($stmt, ':consent', $consentPub);
        oci_bind_by_name($stmt, ':email', $emailTrunc);
        oci_bind_by_name($stmt, ':canal', $canal);

        $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$ok) {
            $err = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($err['message'] ?? 'Erro ao cadastrar confeccionista.');
        }
        oci_free_statement($stmt);

        $state = Auth::getState();
        $state['designersMeta'][$doc] = [
            'telefone'               => $telefone,
            'nomeProfissional'       => $nomeProf ?: $nome,
            'especialidades'         => $especialidades,
            'consentimentoUsoImagem' => !empty($dados['consentimentoUsoImagem']),
            'uf'                     => $ufIn,
            'cidade'                 => $cidadeIn,
            'nota'                   => 5.0,
            'restricaoAtiva'         => false,
        ];
        Auth::saveState($state);

        return self::obterPorId($doc, false);
    }

    public static function atualizarPerfil(string $idParam, array $dados): array {
        if (isset($dados['foto'])) {
            Auth::validarFoto($dados['foto']);
        }
        $atual = $idParam !== '' ? self::obterPorId($idParam, false) : null;
        if (!$atual) {
            $atual = self::obterAtual(false);
        }
        if (!$atual) {
            throw new RuntimeException('Designer não encontrado.');
        }
        $doc = $atual['documento'];

        foreach (['documento', 'cpfCnpj', 'cpf', 'cnpj'] as $docField) {
            if (!empty($dados[$docField]) && Auth::onlyDigits($dados[$docField]) !== $doc) {
                throw new InvalidArgumentException('O CPF ou CNPJ não pode ser alterado após o cadastro.');
            }
        }

        if (!empty($dados['email']) && Auth::norm($dados['email']) !== Auth::norm($atual['email'])) {
            if (Auth::emailExisteEmQualquerPerfil($dados['email'], $doc)) {
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

        $nomeProf  = trim((string)($dados['nomeProfissional'] ?? $dados['nome'] ?? $atual['nomeProfissional']));
        $nmConf    = mb_substr($nomeProf ?: $atual['nome'], 0, 150);
        $razao     = mb_substr(trim((string)($dados['razaoSocial'] ?? $atual['razaoSocial'])), 0, 150);
        $email     = mb_substr(trim((string)($dados['email'] ?? $atual['email'])), 0, 150);
        $numero    = mb_substr(trim((string)($dados['numero'] ?? $atual['numero'])), 0, 4);
        $dsCompl   = mb_substr(trim((string)($dados['complemento'] ?? $atual['complemento'])), 0, 100);
        $sobreMim  = mb_substr(trim((string)($dados['sobreMim'] ?? $atual['sobreMim'])), 0, 500);
        $manifesto = mb_substr(trim((string)($dados['manifesto'] ?? $atual['manifesto'])), 0, 500);
        $insta     = mb_substr(trim((string)($dados['instagram'] ?? $atual['instagram'])), 0, 100);
        $portfolio = mb_substr(trim((string)($dados['portfolio'] ?? $dados['site'] ?? $atual['portfolio'])), 0, 500);
        $site      = mb_substr(trim((string)($dados['site'] ?? $dados['portfolio'] ?? $atual['site'])), 0, 500);
        $faixa     = mb_substr(trim((string)($dados['faixaExperiencia'] ?? $atual['faixaExperiencia'])), 0, 50);
        $consent   = array_key_exists('consentimentoPerfilPublico', $dados)
            ? (!empty($dados['consentimentoPerfilPublico']) ? 1 : 0)
            : ($atual['consentimentoPerfilPublico'] ? 1 : 0);

        $telefone = isset($dados['telefone']) ? Auth::onlyDigits($dados['telefone']) : $atual['telefone'];
        $especialidades = isset($dados['especialidades']) && is_array($dados['especialidades'])
            ? array_values($dados['especialidades'])
            : $atual['especialidades'];
        $metaJson = mb_substr(json_encode(['telefone' => $telefone], JSON_UNESCAPED_UNICODE), 0, 100);

        $conn = Database::getConnection();
        $sql = "UPDATE CONFECCIONISTA
                   SET NM_CONFECCIONISTA            = :nome,
                       RAZAO_SOCIAL                 = :razao,
                       EMAIL_CONF                   = :email,
                       CEP                          = :cep,
                       NR_ENDERECO                  = :numero,
                       DS_COMPLEMENTO               = :dsCompl,
                       DS_SOBRE_MIM                 = :sobreMim,
                       MANIFESTO                    = :manifesto,
                       INSTAGRAM                    = :insta,
                       PORTFOLIO_URL                = :portfolio,
                       SITE_URL                     = :site,
                       FAIXA_EXPERIENCIA            = :faixa,
                       COMPLEMENTO                  = :metaJson,
                       CONSENTIMENTO_PERFIL_PUBLICO = :consent
                 WHERE TRIM(CPF_CNPJ) = :doc";

        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':nome', $nmConf);
        oci_bind_by_name($stmt, ':razao', $razao);
        oci_bind_by_name($stmt, ':email', $email);
        oci_bind_by_name($stmt, ':cep', $cep);
        oci_bind_by_name($stmt, ':numero', $numero);
        oci_bind_by_name($stmt, ':dsCompl', $dsCompl);
        oci_bind_by_name($stmt, ':sobreMim', $sobreMim);
        oci_bind_by_name($stmt, ':manifesto', $manifesto);
        oci_bind_by_name($stmt, ':insta', $insta);
        oci_bind_by_name($stmt, ':portfolio', $portfolio);
        oci_bind_by_name($stmt, ':site', $site);
        oci_bind_by_name($stmt, ':faixa', $faixa);
        oci_bind_by_name($stmt, ':metaJson', $metaJson);
        oci_bind_by_name($stmt, ':consent', $consent);
        oci_bind_by_name($stmt, ':doc', $doc);

        $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$ok) {
            $err = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($err['message'] ?? 'Erro ao atualizar perfil do designer.');
        }
        oci_free_statement($stmt);

        $state = Auth::getState();
        $state['designersMeta'][$doc] = array_merge($state['designersMeta'][$doc] ?? [], [
            'telefone'           => $telefone,
            'nomeProfissional'   => $nomeProf ?: $nmConf,
            'especialidades'     => $especialidades,
            'capacidadeProducao' => $dados['capacidadeProducao'] ?? ($state['designersMeta'][$doc]['capacidadeProducao'] ?? 10),
            'foto'               => $dados['foto'] ?? ($state['designersMeta'][$doc]['foto'] ?? ''),
        ]);
        Auth::saveState($state);

        $atualizado = self::obterPorId($doc, false);
        $sessao = Auth::getSessao('designer');
        if ($sessao && ($sessao['usuario']['documento'] ?? '') === $doc) {
            Auth::setSessao('designer', ['perfil' => 'designer', 'id' => $doc, 'usuario' => $atualizado]);
        }

        return $atualizado;
    }

    public static function alternarFavorito(string $loteId): array {
        $designer = self::obterAtual(false);
        $doc = $designer['documento'] ?? '';
        if ($doc === '') {
            throw new InvalidArgumentException('Confeccionista não identificado.');
        }
        $loteIdStr = trim($loteId);

        $state = Auth::getState();
        $favs = array_values(array_map('strval', $state['favoritos'][$doc] ?? []));
        $idx = array_search($loteIdStr, $favs, true);

        if ($idx !== false) {
            array_splice($favs, $idx, 1);
        } else {
            $favs[] = $loteIdStr;
        }

        $state['favoritos'][$doc] = $favs;
        Auth::saveState($state);

        return $favs;
    }
}
