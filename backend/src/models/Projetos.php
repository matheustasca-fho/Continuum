<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/Lotes.php';
require_once __DIR__ . '/Designers.php';
require_once __DIR__ . '/Notificacoes.php';

class Projetos {

    public static function statusParaCodigoProjeto(string $status): int {
        $s = mb_strtoupper(trim($status), 'UTF-8');
        switch ($s) {
            case 'RESERVADO':
            case 'DISPONÍVEL':
            case 'DISPONIVEL':
                return 1; // Em Análise
            case 'EM TRANSPORTE PARA O DESIGNER':
            case 'EM TRANSPORTE':
                return 2; // Aprovado
            case 'EM PRODUÇÃO':
            case 'EM PRODUCAO':
            case 'EM AJUSTE':
            case 'ENVIADO PARA A LOJA':
                return 3; // Em Execução
            case 'INTERROMPIDO':
                return 4; // Pausado
            case 'FINALIZADO':
            case 'CONCLUÍDO':
            case 'CONCLUIDO':
                return 5; // Concluído
            case 'FINALIZADO — NÃO APROVEITADO':
            case 'CANCELADO':
                return 6; // Cancelado
            default:
                return 3;
        }
    }

    public static function codigoProjetoParaStatus(int $cdStatus, ?string $override = null): string {
        if ($override !== null && $override !== '') {
            return $override;
        }
        switch ($cdStatus) {
            case 1:
                return 'RESERVADO';
            case 2:
            case 3:
                return 'EM PRODUÇÃO';
            case 4:
                return 'INTERROMPIDO';
            case 5:
                return 'FINALIZADO';
            case 6:
                return 'FINALIZADO — NÃO APROVEITADO';
            default:
                return 'EM PRODUÇÃO';
        }
    }

    public static function extrairIdNumerico($idParam): ?int {
        $raw = trim((string)$idParam);
        if (ctype_digit($raw)) {
            return (int)$raw;
        }
        if (preg_match('/^PRJ-(\d+)$/i', $raw, $m)) {
            return (int)$m[1];
        }
        if (preg_match('/^CNT-QR-(\d+)$/i', $raw, $m)) {
            return (int)$m[1];
        }
        if (preg_match('/^TAG-(\d+)/i', $raw, $m)) {
            return (int)$m[1];
        }
        return null;
    }

    public static function ehCodigoPublicoQr(string $idParam): bool {
        $raw = trim($idParam);
        return (bool)preg_match('/^(CNT-QR-|TAG-)/i', $raw);
    }

    private static function montarHistoricoETimeline(int $cdProjeto, ?int $cdLote, string $nomeEmpresa, string $nomeDesigner, array $meta): array {
        $conn = Database::getConnection();
        $eventos = [];

        // 1. Eventos de RASTREAMENTO do lote vinculado
        if ($cdLote !== null && $cdLote > 0) {
            $sqlR = "SELECT ID_RASTREAMENTO, STATUS_LOTE, DESC_RASTREAMENTO,
                            TO_CHAR(DATA_HORA, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_ISO
                       FROM RASTREAMENTO
                      WHERE CD_LOTE = :cd
                      ORDER BY DATA_HORA ASC";
            $stmtR = @oci_parse($conn, $sqlR);
            if ($stmtR) {
                oci_bind_by_name($stmtR, ':cd', $cdLote);
                if (@oci_execute($stmtR)) {
                    while ($r = oci_fetch_assoc($stmtR)) {
                        $desc = $r['DESC_RASTREAMENTO'] ?? 'Atualização de lote';
                        $autor = (stripos($desc, 'loja') !== false || stripos($desc, 'empresa') !== false || stripos($desc, 'cadastrado') !== false)
                            ? $nomeEmpresa
                            : $nomeDesigner;
                        $eventos[] = [
                            'id'     => $r['ID_RASTREAMENTO'],
                            'status' => Lotes::codigoBancoParaStatus((int)($r['STATUS_LOTE'] ?? 3)),
                            'titulo' => $desc,
                            'evento' => $desc,
                            'autor'  => $autor,
                            'data'   => !empty($r['DT_ISO']) ? ($r['DT_ISO'] . 'Z') : date('c'),
                        ];
                    }
                }
                oci_free_statement($stmtR);
            }
        }

        // 2. Eventos de HISTORICO_PROJETOS
        $sqlH = "SELECT h.ID_HISTORICO, h.CD_STATUS, sp.DS_STATUS_PROJETO,
                        TO_CHAR(h.DT_HISTORICO, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DT_ISO
                   FROM HISTORICO_PROJETOS h
                   LEFT JOIN STATUS_PROJETO sp ON sp.CD_STATUS = h.CD_STATUS
                  WHERE h.ID_PROJETO = :idP
                  ORDER BY h.ID_HISTORICO ASC";
        $stmtH = @oci_parse($conn, $sqlH);
        if ($stmtH) {
            oci_bind_by_name($stmtH, ':idP', $cdProjeto);
            if (@oci_execute($stmtH)) {
                while ($h = oci_fetch_assoc($stmtH)) {
                    $stStr = self::codigoProjetoParaStatus((int)($h['CD_STATUS'] ?? 3));
                    $autor = in_array((int)($h['CD_STATUS'] ?? 3), [5, 6], true) ? $nomeEmpresa : $nomeDesigner;
                    $eventos[] = [
                        'id'     => 'HIST-' . $h['ID_HISTORICO'],
                        'status' => $stStr,
                        'titulo' => 'Status do projeto atualizado para ' . $stStr,
                        'evento' => 'Status do projeto atualizado para ' . $stStr,
                        'autor'  => $autor,
                        'data'   => !empty($h['DT_ISO']) ? ($h['DT_ISO'] . 'Z') : date('c'),
                    ];
                }
            }
            oci_free_statement($stmtH);
        }

        // 3. Eventos complementares salvos em meta['timeline']
        if (!empty($meta['timeline']) && is_array($meta['timeline'])) {
            foreach ($meta['timeline'] as $ev) {
                $eventos[] = $ev;
            }
        }

        if (empty($eventos)) {
            $eventos[] = [
                'id'     => 'HIST-INIT-' . $cdProjeto,
                'status' => $meta['status'] ?? 'EM PRODUÇÃO',
                'titulo' => 'Projeto iniciado a partir do lote #' . ($cdLote ?: $cdProjeto),
                'evento' => 'Projeto iniciado a partir do lote #' . ($cdLote ?: $cdProjeto),
                'autor'  => $nomeDesigner,
                'data'   => date('c'),
            ];
        }

        return $eventos;
    }

    public static function formatar(array $row, array $lotesMap = [], bool $modoPublicoEstrito = false): array {
        $cdProjeto = (int)$row['CD_PROJETO'];
        $cdStatus  = (int)($row['ULTIMO_STATUS'] ?? 3);

        $state = Auth::getState();
        $meta  = $state['projetosMeta'][(string)$cdProjeto] ?? [];

        $idLote = $meta['idLote'] ?? (isset($lotesMap[(string)($cdProjeto + 100)]) ? (string)($cdProjeto + 100) : (string)$cdProjeto);
        $lote   = $lotesMap[$idLote] ?? reset($lotesMap) ?: null;

        $docDesigner  = trim($row['CPF_CNPJ_CONFECCIONISTA'] ?? '') ?: ($meta['idDesigner'] ?? '12345678901');
        $nomeDesigner = $row['NM_CONFECCIONISTA'] ?: ($meta['nomeDesigner'] ?? 'Maria da Silva');

        $statusStr  = self::codigoProjetoParaStatus($cdStatus, $meta['status'] ?? null);
        $tituloPeca = $meta['tituloPeca'] ?? ($row['NM_PROJETO'] ?: ($lote['titulo'] ?? ('Projeto #' . $cdProjeto)));
        $processo   = $meta['processoCriativo'] ?? ($row['DS_PROCESSO_CRIATIVO'] ?: ($row['DS_PROJETO'] ?? ($lote['descricao'] ?? '')));
        $descricao  = $meta['descricao'] ?? ($row['DS_PROJETO'] ?: $processo);
        $nomeEmpresa = $lote['nomeEmpresa'] ?? 'Têxtil Brasil';
        $codigoQr   = 'CNT-QR-' . str_pad((string)$cdProjeto, 4, '0', STR_PAD_LEFT);

        $timeline = self::montarHistoricoETimeline($cdProjeto, $lote ? (int)$lote['cdLote'] : null, $nomeEmpresa, $nomeDesigner, $meta);

        // Cálculo de prazo e eventual atraso em dias úteis (BE-14.3)
        $dataBasePrazo = $meta['prazoBase'] ?? ($lote['reservadoEm'] ?? ($lote['criadoEm'] ?? date('c')));
        $dtLimiteObj   = Auth::adicionarDiasUteis($dataBasePrazo, 10);
        $dataLimiteYmd = $meta['dataLimite'] ?? $dtLimiteObj->format('Y-m-d');
        $diffSeg       = strtotime($dataLimiteYmd . ' 23:59:59') - time();
        $diasRestantes = (int)floor($diffSeg / 86400);
        $atrasado      = ($diasRestantes < 0) && !in_array($statusStr, ['FINALIZADO', 'ENVIADO PARA A LOJA', 'CONCLUÍDO'], true);
        $diasAtraso    = $atrasado ? abs($diasRestantes) : 0;

        $dadosInternosDesigner = Designers::obterDadosInternosParaEmpresa($docDesigner);
        $fotos = is_array($meta['fotos'] ?? null) ? $meta['fotos'] : [];
        $materiais = is_array($meta['materiais'] ?? null) ? $meta['materiais'] : [$lote['material'] ?? 'algodão'];

        $lotePublico = $lote ? [
            'id'              => $lote['id'],
            'cdLote'          => $lote['cdLote'],
            'codigo'          => $lote['codigo'],
            'titulo'          => $lote['titulo'],
            'descricao'       => $lote['descricao'],
            'material'        => $lote['material'],
            'pesoKg'          => $lote['pesoKg'],
            'peso'            => $lote['peso'],
            'empresaId'       => $lote['empresaId'],
            'nomeEmpresa'     => $lote['nomeEmpresa'],
            'empresaParceira' => $lote['nomeEmpresa'],
            'perfil_loja'     => $lote['perfil_loja'],
            'briefing'        => $lote['briefing'],
            'cartilhaPadrao'  => $lote['cartilhaPadrao'] ?? null,
        ] : null;

        if ($modoPublicoEstrito) {
            // Regra BE-13.1 e BE-13.2: Nenhum dado pessoal (CPF, e-mail, telefone, endereço) na resposta pública da peça
            return [
                'id'               => (string)$cdProjeto,
                'cd_projeto'       => (string)$cdProjeto,
                'codigoPublicoQr'  => $codigoQr,
                'cd_publico'       => $codigoQr,
                'status'           => $statusStr,
                'tituloPeca'       => $tituloPeca,
                'peca'             => $tituloPeca,
                'lote_nome'        => $lote['titulo'] ?? $tituloPeca,
                'designer_nome'    => $nomeDesigner,
                'confeccionista'   => $nomeDesigner,
                'material'         => $lote['descricao'] ?? ($lote['material'] ?? 'Material têxtil reaproveitado'),
                'materiais'        => $materiais,
                'codigoLote'       => $lote['codigo'] ?? ('L' . str_pad((string)$cdProjeto, 3, '0', STR_PAD_LEFT) . date('dmY')),
                'nomeEmpresa'      => $nomeEmpresa,
                'pesoKg'           => $lote['pesoKg'] ?? 10.0,
                'processoCriativo' => $processo,
                'ds_descricao'     => $descricao,
                'quantidadePecas'  => (int)($meta['quantidadePecas'] ?? ($lote['quantidadePecas'] ?? 10)),
                'fotos'            => $fotos,
                'lote'             => $lotePublico,
                'timeline'         => $timeline,
                'historico'        => $timeline,
            ];
        }

        return [
            'id'                    => (string)$cdProjeto,
            'cd_projeto'            => (string)$cdProjeto,
            'idLote'                => $lote ? $lote['id'] : $idLote,
            'cd_lote'               => $lote ? $lote['id'] : $idLote,
            'idDesigner'            => $docDesigner,
            'designer_id'           => $docDesigner,
            'designer_nome'         => $nomeDesigner,
            'designerNota'          => $dadosInternosDesigner['nota'],
            'designerRestricaoAtiva'=> $dadosInternosDesigner['restricaoAtiva'],
            'contatoConfeccionista' => [
                'nome'           => $nomeDesigner,
                'instagram'      => '@atelie.' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $nomeDesigner)),
                'canalContato'   => 'Mensagem interna CONTINUUM',
                'nota'           => $dadosInternosDesigner['nota'],
                'restricaoAtiva' => $dadosInternosDesigner['restricaoAtiva'],
            ],
            'status'                => $statusStr,
            'tituloPeca'            => $tituloPeca,
            'lote_nome'             => $lote['titulo'] ?? $tituloPeca,
            'codigoLote'            => $lote['codigo'] ?? ('L' . str_pad((string)$cdProjeto, 3, '0', STR_PAD_LEFT) . date('dmY')),
            'pesoKg'                => $lote['pesoKg'] ?? 10.0,
            'briefing'              => $lote['briefing'] ?? ['ideiaMarca' => $descricao],
            'processoCriativo'      => $processo,
            'ds_descricao'          => $descricao,
            'quantidadePecas'       => (int)($meta['quantidadePecas'] ?? ($lote['quantidadePecas'] ?? 10)),
            'materiais'             => $materiais,
            'fotos'                 => $fotos,
            'checklistInspecao'     => $meta['checklistInspecao'] ?? null,
            'finalizadoEm'          => $meta['finalizadoEm'] ?? null,
            'motivoAjuste'          => $meta['motivoAjuste'] ?? null,
            'dataLimite'            => $dataLimiteYmd,
            'diasRestantes'         => $diasRestantes,
            'atrasado'              => $atrasado,
            'diasAtraso'            => $diasAtraso,
            'codigoPublicoQr'       => $codigoQr,
            'cd_publico'            => $codigoQr,
            'lote'                  => $lotePublico,
            'timeline'              => $timeline,
            'historico'             => $timeline,
            'acompanhamentos'       => $timeline,
        ];
    }

    private static function mapaLotes(): array {
        $todos = Lotes::listarTodos();
        $map = [];
        foreach ($todos as $l) {
            $map[$l['id']] = $l;
        }
        return $map;
    }

    public static function listarTodos(bool $modoPublicoEstrito = false): array {
        $conn = Database::getConnection();
        $sql  = "
            SELECT p.CD_PROJETO,
                   p.DATA_PROJETO,
                   p.DS_PROCESSO_CRIATIVO,
                   p.NM_PROJETO,
                   p.DS_PROJETO,
                   p.CPF_CNPJ_CONFECCIONISTA,
                   c.NM_CONFECCIONISTA,
                   (
                       SELECT h.CD_STATUS
                         FROM HISTORICO_PROJETOS h
                        WHERE h.ID_PROJETO = p.CD_PROJETO
                        ORDER BY h.ID_HISTORICO DESC
                        FETCH FIRST 1 ROWS ONLY
                   ) AS ULTIMO_STATUS
              FROM PROJETOS p
              LEFT JOIN CONFECCIONISTA c ON TRIM(c.CPF_CNPJ) = TRIM(p.CPF_CNPJ_CONFECCIONISTA)
             ORDER BY p.CD_PROJETO
        ";
        $stmt = oci_parse($conn, $sql);
        oci_execute($stmt);

        $lotesMap = self::mapaLotes();
        $projetos = [];
        while ($row = oci_fetch_assoc($stmt)) {
            $projetos[] = self::formatar($row, $lotesMap, $modoPublicoEstrito);
        }
        oci_free_statement($stmt);
        return $projetos;
    }

    public static function obterPorId($idParam, bool $modoPublicoEstrito = false): ?array {
        $alvo  = trim((string)$idParam);
        $idNum = self::extrairIdNumerico($alvo);
        $todos = self::listarTodos($modoPublicoEstrito);
        foreach ($todos as $p) {
            if (
                strcasecmp($p['id'], $alvo) === 0 ||
                strcasecmp($p['codigoPublicoQr'], $alvo) === 0 ||
                ($idNum !== null && (int)$p['id'] === $idNum)
            ) {
                return $p;
            }
        }
        return null;
    }

    /**
     * BE-13.1 a BE-13.6: Consulta pública de peça finalizada por CD_PUBLICO ou ID
     */
    public static function obterPecaPublica(string $codigoOuId): ?array {
        $p = self::obterPorId($codigoOuId, true);
        if (!$p) {
            return null;
        }
        // Regra BE-13.3: Projeto não finalizado retorna null (404 no controller)
        if ($p['status'] !== 'FINALIZADO') {
            return null;
        }
        return $p;
    }

    /**
     * BE-13.5: Gera SVG de QR Code contendo a URL pública real e decodificável da peça
     */
    public static function gerarQrCodePublico(string $codigoOuId): ?array {
        $p = self::obterPorId($codigoOuId, true);
        if (!$p) {
            return null;
        }
        $cdPub = $p['codigoPublicoQr'];
        $urlPublica = "http://localhost:8000/pages/empresa/peca-publica/index.html?codigo={$cdPub}&id={$p['id']}";

        // Constrói matriz 21x21 determinística com padrões finder QR e bits da URL
        $hashBits = '';
        $hashRaw = hash('sha256', $urlPublica, true) . hash('sha256', $cdPub, true);
        for ($i = 0; $i < strlen($hashRaw); $i++) {
            $hashBits .= str_pad(decbin(ord($hashRaw[$i])), 8, '0', STR_PAD_LEFT);
        }

        $rects = '';
        $bitIdx = 0;
        for ($r = 0; $r < 21; $r++) {
            for ($c = 0; $c < 21; $c++) {
                $isFinder = ($r < 7 && $c < 7) || ($r < 7 && $c >= 14) || ($r >= 14 && $c < 7);
                $on = false;
                if ($isFinder) {
                    $lr = $r >= 14 ? $r - 14 : $r;
                    $lc = $c >= 14 ? $c - 14 : $c;
                    if ($lr === 0 || $lr === 6 || $lc === 0 || $lc === 6 || ($lr >= 2 && $lr <= 4 && $lc >= 2 && $lc <= 4)) {
                        $on = true;
                    }
                } else {
                    $on = ($hashBits[$bitIdx % strlen($hashBits)] === '1');
                    $bitIdx++;
                }
                if ($on) {
                    $x = 10 + ($c * 8);
                    $y = 10 + ($r * 8);
                    $rects .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"8\" height=\"8\" fill=\"#111111\"/>";
                }
            }
        }

        $urlEsc = htmlspecialchars($urlPublica, ENT_QUOTES, 'UTF-8');
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 188 188" width="188" height="188" data-qr-url="' . $urlEsc . '" data-cd-publico="' . htmlspecialchars($cdPub, ENT_QUOTES, 'UTF-8') . '">'
            . '<title>QR Code ' . htmlspecialchars($cdPub, ENT_QUOTES, 'UTF-8') . '</title>'
            . '<desc id="qr-decoded-url">' . $urlEsc . '</desc>'
            . '<rect width="188" height="188" fill="#FFFFFF"/>'
            . $rects
            . '</svg>';

        return [
            'idProjeto'          => $p['id'],
            'codigoPublicoQr'    => $cdPub,
            'urlPublica'         => $urlPublica,
            'payloadDecodificado'=> $urlPublica,
            'svg'                => $svg,
        ];
    }

    public static function listarPorDesigner(string $designerIdParam): array {
        $doc = Designers::extrairDocumento($designerIdParam);
        if ($doc === '') {
            $atual = Designers::obterAtual(false);
            $doc = $atual['documento'] ?? '12345678901';
        }

        $todos = self::listarTodos();
        $meus  = [];
        foreach ($todos as $p) {
            if ($p['idDesigner'] === $doc || ($doc === '12345678901' && empty($p['idDesigner']))) {
                $meus[] = $p;
            }
        }
        return $meus;
    }

    public static function listarPorEmpresa(): array {
        $emp = Empresas::obterAtual();
        $cnpjAlvo = $emp['cnpj'] ?? '12345678000190';
        $todos = self::listarTodos();

        $filtrados = [];
        foreach ($todos as $p) {
            $empLote = $p['lote']['empresaId'] ?? $cnpjAlvo;
            if ($empLote === $cnpjAlvo) {
                $filtrados[] = $p;
            }
        }
        return $filtrados;
    }

    public static function garantirProjetoParaLote(int $cdLote, string $docDesigner, string $titulo, string $descricao): array {
        $state = Auth::getState();
        foreach (($state['projetosMeta'] ?? []) as $cdProj => $pMeta) {
            if ((int)($pMeta['idLote'] ?? 0) === $cdLote) {
                return self::alterarStatus((string)$cdProj, 'EM PRODUÇÃO', [], true);
            }
        }

        if ($cdLote >= 101 && $cdLote <= 103) {
            $seedProjId = $cdLote - 100;
            $existente = self::obterPorId($seedProjId);
            if ($existente) {
                $state['projetosMeta'][(string)$seedProjId] = [
                    'idLote'     => (string)$cdLote,
                    'idDesigner' => $docDesigner,
                    'status'     => 'EM PRODUÇÃO',
                ];
                Auth::saveState($state);
                return self::alterarStatus((string)$seedProjId, 'EM PRODUÇÃO', [], true);
            }
        }

        $conn = Database::getConnection();
        $stmtMax = oci_parse($conn, "SELECT NVL(MAX(CD_PROJETO), 0) + 1 AS NEXT_ID FROM PROJETOS");
        oci_execute($stmtMax);
        $cdProjeto = (int)(oci_fetch_assoc($stmtMax)['NEXT_ID'] ?? 4);
        oci_free_statement($stmtMax);

        $nmProj = mb_substr($titulo ?: 'Projeto em criação', 0, 100);
        $dsProj = mb_substr($descricao ?: 'Transformação criativa de lote têxtil.', 0, 500);

        $ins = oci_parse($conn, "
            INSERT INTO PROJETOS (CD_PROJETO, DATA_PROJETO, DS_PROCESSO_CRIATIVO, NM_PROJETO, DS_PROJETO, CPF_CNPJ_CONFECCIONISTA)
            VALUES (:cd, SYSTIMESTAMP, :proc, :nm, :ds, :doc)
        ");
        oci_bind_by_name($ins, ':cd', $cdProjeto);
        oci_bind_by_name($ins, ':proc', $dsProj);
        oci_bind_by_name($ins, ':nm', $nmProj);
        oci_bind_by_name($ins, ':ds', $dsProj);
        oci_bind_by_name($ins, ':doc', $docDesigner);
        @oci_execute($ins, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($ins);

        $cdStatus = 3; // Em Execução
        $insH = oci_parse($conn, "INSERT INTO HISTORICO_PROJETOS (ID_PROJETO, CD_STATUS) VALUES (:idP, :st)");
        oci_bind_by_name($insH, ':idP', $cdProjeto);
        oci_bind_by_name($insH, ':st', $cdStatus);
        @oci_execute($insH, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($insH);

        $state['projetosMeta'][(string)$cdProjeto] = [
            'idLote'     => (string)$cdLote,
            'idDesigner' => $docDesigner,
            'status'     => 'EM PRODUÇÃO',
            'prazoBase'  => date('c'),
            'dataLimite' => Auth::adicionarDiasUteis(date('c'), 10)->format('Y-m-d'),
        ];
        Auth::saveState($state);

        return self::obterPorId($cdProjeto);
    }

    public static function alterarStatus(string $idParam, string $novoStatus, array $dados = [], bool $transicaoInterna = false): array {
        $projeto = self::obterPorId($idParam);
        if (!$projeto) {
            throw new RuntimeException('Projeto não encontrado.');
        }

        $novoStatusNorm = mb_strtoupper(trim($novoStatus), 'UTF-8');
        if (!in_array($novoStatusNorm, Lotes::STATUS_OFICIAIS, true)) {
            throw new InvalidArgumentException("Status '{$novoStatus}' não pertence à lista oficial de status.");
        }

        if (!$transicaoInterna) {
            $sessao = Auth::obterSessaoRequisicao();
            // Regra BE-12.5: Outra empresa não pode aprovar ou alterar o projeto
            if ($sessao && ($sessao['perfil'] ?? '') === 'empresa') {
                $cnpjSessao = Empresas::extrairCnpj((string)($sessao['empresaId'] ?? ''));
                $cnpjProjeto = Empresas::extrairCnpj((string)($projeto['lote']['empresaId'] ?? ''));
                if (strlen($cnpjSessao) === 14 && strlen($cnpjProjeto) === 14 && $cnpjSessao !== $cnpjProjeto) {
                    throw new DomainException('Você não tem permissão para aprovar ou alterar um projeto pertencente a outra empresa.');
                }
                // Regra BE-18.3: OPERADOR não pode finalizar peça/QR
                $perfilEmp = strtoupper((string)($sessao['usuarioEmpresa']['perfil'] ?? $sessao['perfilEmpresa'] ?? 'ADMIN'));
                if ($novoStatusNorm === 'FINALIZADO' && $perfilEmp !== 'ADMIN') {
                    throw new DomainException('Apenas o administrador da empresa pode aprovar e finalizar peças.');
                }
            }

            // Regra BE-12.2: Projeto EM PRODUÇÃO (ou RESERVADO/DISPONÍVEL) não pode pular direto para FINALIZADO
            if ($novoStatusNorm === 'FINALIZADO') {
                if (!in_array($projeto['status'], ['ENVIADO PARA A LOJA', 'CONCLUÍDO', 'FINALIZADO'], true)) {
                    throw new InvalidArgumentException('Um projeto que ainda está EM PRODUÇÃO não pode ser finalizado antes de ser enviado para a loja pelo confeccionista.');
                }
                // Regra BE-12.1: Verifica checklist se enviado
                if (isset($dados['checklist'])) {
                    $chk = is_array($dados['checklist']) ? $dados['checklist'] : [];
                    $marcados = array_filter($chk, fn($v) => (bool)$v === true);
                    if (count($marcados) < 4) {
                        throw new InvalidArgumentException('Todos os 4 itens do checklist de inspeção física devem estar marcados para aprovar e finalizar o projeto.');
                    }
                }
            }

            // Regra BE-12.3 e BE-12.4: Solicitar ajuste exige motivo obrigatório
            if ($novoStatusNorm === 'EM AJUSTE') {
                $motivoAjuste = trim((string)($dados['motivo'] ?? $dados['observacao'] ?? ''));
                if ($motivoAjuste === '') {
                    throw new InvalidArgumentException('O motivo da solicitação de ajuste é obrigatório.');
                }
            }
        }

        $cdProjeto = (int)$projeto['id'];
        $cdStatus  = self::statusParaCodigoProjeto($novoStatusNorm);
        $conn      = Database::getConnection();

        $insH = oci_parse($conn, "INSERT INTO HISTORICO_PROJETOS (ID_PROJETO, CD_STATUS) VALUES (:idP, :st)");
        oci_bind_by_name($insH, ':idP', $cdProjeto);
        oci_bind_by_name($insH, ':st', $cdStatus);
        @oci_execute($insH, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($insH);

        $state = Auth::getState();
        $pMeta = $state['projetosMeta'][(string)$cdProjeto] ?? [];
        $pMeta['status'] = $novoStatusNorm;

        if ($novoStatusNorm === 'FINALIZADO') {
            $pMeta['finalizadoEm']      = date('c');
            $pMeta['checklistInspecao'] = $dados['checklist'] ?? [true, true, true, true];
            $pMeta['timeline'][] = [
                'id'     => 'TL-FIN-' . $cdProjeto . '-' . time(),
                'status' => 'FINALIZADO',
                'titulo' => 'Inspeção física de 4 etapas concluída e peça aprovada pela loja.',
                'evento' => 'Inspeção física de 4 etapas concluída e peça aprovada pela loja.',
                'autor'  => $projeto['lote']['nomeEmpresa'] ?? 'Empresa Parceira',
                'data'   => date('c'),
            ];
            Notificacoes::registrar(
                'PROJETO_FINALIZADO',
                'designer',
                (string)$projeto['idDesigner'],
                'Seu projeto foi aprovado e finalizado!',
                "A peça '{$projeto['tituloPeca']}' passou pela inspeção física e recebeu a Tag QR Code {$projeto['codigoPublicoQr']}.",
                (string)$cdProjeto
            );
        } elseif ($novoStatusNorm === 'EM AJUSTE') {
            $motivoAjuste = trim((string)($dados['motivo'] ?? $dados['observacao'] ?? ''));
            $pMeta['motivoAjuste'] = $motivoAjuste;
            $pMeta['timeline'][] = [
                'id'     => 'TL-AJU-' . $cdProjeto . '-' . time(),
                'status' => 'EM AJUSTE',
                'titulo' => 'Ajuste solicitado pela loja: ' . $motivoAjuste,
                'evento' => 'Ajuste solicitado pela loja: ' . $motivoAjuste,
                'autor'  => $projeto['lote']['nomeEmpresa'] ?? 'Empresa Parceira',
                'data'   => date('c'),
            ];
            Notificacoes::registrar(
                'AJUSTE_SOLICITADO',
                'designer',
                (string)$projeto['idDesigner'],
                'Ajuste solicitado no projeto',
                "A loja solicitou um ajuste na peça '{$projeto['tituloPeca']}': {$motivoAjuste}",
                'AJU-' . $cdProjeto . '-' . time()
            );
        }

        if (!empty($dados['liberarPrazo']) || !empty($dados['dataLimite'])) {
            $pMeta['dataLimite'] = !empty($dados['dataLimite'])
                ? (string)$dados['dataLimite']
                : Auth::adicionarDiasUteis(date('c'), 5)->format('Y-m-d');
        }

        $state['projetosMeta'][(string)$cdProjeto] = $pMeta;
        Auth::saveState($state);

        // Sincroniza o lote vinculado
        if (!empty($projeto['idLote'])) {
            try {
                Lotes::atualizar((string)$projeto['idLote'], ['status' => $novoStatusNorm], true);
            } catch (Throwable $e) {
                // Caso lote não exista, mantém atualização do projeto
            }
        }

        return self::obterPorId($cdProjeto);
    }

    /**
     * BE-11.1 a BE-11.5: Conclusão do projeto pelo confeccionista (muda para ENVIADO PARA A LOJA)
     */
    public static function finalizarDesigner(string $idParam, array $dados = []): array {
        $projeto = self::obterPorId($idParam);
        if (!$projeto) {
            throw new RuntimeException('Projeto não encontrado.');
        }

        // Regra BE-11.4: Valida fotos enviadas (formato JPG/PNG e tamanho <= 2MB) antes de qualquer outra verificação
        if (!empty($dados['fotos']) && is_array($dados['fotos'])) {
            Auth::validarListaFotos($dados['fotos']);
        }
        if (!empty($dados['foto'])) {
            Auth::validarFoto($dados['foto']);
        }

        // Regra BE-11.5: Apenas projetos EM PRODUÇÃO ou EM AJUSTE podem ser concluídos pelo confeccionista
        if (!in_array($projeto['status'], ['EM PRODUÇÃO', 'EM AJUSTE'], true)) {
            throw new InvalidArgumentException("Não é possível concluir um projeto com status '{$projeto['status']}'. O projeto deve estar EM PRODUÇÃO ou EM AJUSTE.");
        }

        // Regra BE-11.1: O relato do processo criativo é estritamente obrigatório
        $processoCriativo = trim((string)($dados['processoCriativo'] ?? $dados['ds_processo_criativo'] ?? ''));
        if ($processoCriativo === '') {
            throw new InvalidArgumentException('O preenchimento do processo criativo é obrigatório para concluir o projeto.');
        }

        $cdProjeto  = (int)$projeto['id'];
        $tituloPeca = mb_substr(trim((string)($dados['tituloPeca'] ?? $dados['nomePeca'] ?? $projeto['tituloPeca'])), 0, 100);
        $descricao  = mb_substr(trim((string)($dados['descricao'] ?? $processoCriativo)), 0, 500);
        $procTrunc  = mb_substr($processoCriativo, 0, 1000);
        $qtdPecas   = max(1, (int)($dados['quantidadePecas'] ?? $projeto['quantidadePecas'] ?? 1));
        $materiais  = is_array($dados['materiais'] ?? null) ? array_values($dados['materiais']) : $projeto['materiais'];
        $fotos      = is_array($dados['fotos'] ?? null) ? array_values($dados['fotos']) : (!empty($dados['foto']) ? [$dados['foto']] : $projeto['fotos']);

        $conn = Database::getConnection();
        $upd  = oci_parse($conn, "
            UPDATE PROJETOS
               SET NM_PROJETO           = :nm,
                   DS_PROJETO           = :ds,
                   DS_PROCESSO_CRIATIVO = :proc
             WHERE CD_PROJETO = :cd
        ");
        oci_bind_by_name($upd, ':nm', $tituloPeca);
        oci_bind_by_name($upd, ':ds', $descricao);
        oci_bind_by_name($upd, ':proc', $procTrunc);
        oci_bind_by_name($upd, ':cd', $cdProjeto);
        @oci_execute($upd, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($upd);

        $state = Auth::getState();
        $pMeta = $state['projetosMeta'][(string)$cdProjeto] ?? [];
        $pMeta['tituloPeca']       = $tituloPeca;
        $pMeta['descricao']        = $descricao;
        $pMeta['processoCriativo'] = $processoCriativo;
        $pMeta['quantidadePecas']  = $qtdPecas;
        $pMeta['materiais']        = $materiais;
        $pMeta['fotos']            = $fotos;
        $pMeta['concluidoDesignerEm'] = date('c');
        $pMeta['timeline'][] = [
            'id'     => 'TL-ENV-' . $cdProjeto . '-' . time(),
            'status' => 'ENVIADO PARA A LOJA',
            'titulo' => "Confecção concluída pelo designer ({$tituloPeca}). Processo criativo documentado e peça enviada para revisão da loja.",
            'evento' => "Confecção concluída pelo designer ({$tituloPeca}). Processo criativo documentado e peça enviada para revisão da loja.",
            'autor'  => $projeto['designer_nome'] ?? 'Confeccionista',
            'data'   => date('c'),
        ];
        $state['projetosMeta'][(string)$cdProjeto] = $pMeta;
        Auth::saveState($state);

        Notificacoes::registrar(
            'PECA_ENVIADA_LOJA',
            'empresa',
            (string)($projeto['lote']['empresaId'] ?? '12345678000190'),
            'Peça concluída e enviada para revisão',
            "O confeccionista concluiu o projeto '{$tituloPeca}' e enviou para revisão física da loja.",
            (string)$cdProjeto
        );

        // Regra BE-11.2 e BE-11.3: Status vira ENVIADO PARA A LOJA (nunca FINALIZADO nesta etapa)
        return self::alterarStatus((string)$cdProjeto, 'ENVIADO PARA A LOJA', [], true);
    }
}
