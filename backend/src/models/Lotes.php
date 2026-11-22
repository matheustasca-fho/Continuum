<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/Empresas.php';
require_once __DIR__ . '/Notificacoes.php';

class Lotes {

    public const STATUS_OFICIAIS = [
        'DISPONÍVEL',
        'RESERVADO',
        'EM TRANSPORTE PARA O DESIGNER',
        'EM TRANSPORTE',
        'EM PRODUÇÃO',
        'EM AJUSTE',
        'ENVIADO PARA A LOJA',
        'CONCLUÍDO',
        'FINALIZADO',
        'FINALIZADO — NÃO APROVEITADO',
        'INTERROMPIDO',
        'CANCELADO',
    ];

    public static function statusParaCodigoBanco($status): int {
        if (is_numeric($status)) {
            $n = (int)$status;
            return ($n >= 1 && $n <= 5) ? $n : 3;
        }
        $s = mb_strtoupper(trim((string)$status), 'UTF-8');
        switch ($s) {
            case 'DISPONÍVEL':
            case 'DISPONIVEL':
                return 3;
            case 'RESERVADO':
            case 'EM TRANSPORTE PARA O DESIGNER':
            case 'EM TRANSPORTE':
                return 2;
            case 'EM PRODUÇÃO':
            case 'EM PRODUCAO':
            case 'EM AJUSTE':
            case 'ENVIADO PARA A LOJA':
                return 4;
            case 'FINALIZADO':
            case 'FINALIZADO — NÃO APROVEITADO':
            case 'CONCLUÍDO':
            case 'CONCLUIDO':
                return 5;
            case 'INTERROMPIDO':
            case 'CANCELADO':
            default:
                return 1;
        }
    }

    public static function codigoBancoParaStatus(int $cdStatus, ?string $overrideStatus = null): string {
        if ($overrideStatus !== null && $overrideStatus !== '') {
            return $overrideStatus;
        }
        switch ($cdStatus) {
            case 2:
                return 'RESERVADO';
            case 4:
                return 'EM PRODUÇÃO';
            case 5:
                return 'FINALIZADO';
            case 1:
                return 'INTERROMPIDO';
            case 3:
            default:
                return 'DISPONÍVEL';
        }
    }

    public static function extrairIdNumerico($idOrCodigo): ?int {
        $raw = trim((string)$idOrCodigo);
        if (ctype_digit($raw)) {
            return (int)$raw;
        }
        if (preg_match('/^LT-(\d+)$/i', $raw, $m)) {
            return (int)$m[1];
        }
        if (preg_match('/^LOT-\d{4}-(\d+)$/i', $raw, $m)) {
            return (int)$m[1];
        }
        if (preg_match('/^L(\d{3})\d{8}$/i', $raw, $m)) {
            return (int)$m[1];
        }
        return null;
    }

    private static function inferirMaterial(string $descricao): string {
        $d = mb_strtolower($descricao, 'UTF-8');
        if (strpos($d, 'jeans') !== false || strpos($d, 'denim') !== false) return 'jeans';
        if (strpos($d, 'malha') !== false) return 'malha';
        if (strpos($d, 'seda') !== false)  return 'seda';
        if (strpos($d, 'metal') !== false || strpos($d, 'bot') !== false || strpos($d, 'ziper') !== false) return 'metal';
        if (strpos($d, 'algod') !== false) return 'algodão';
        return 'algodão';
    }

    public static function formatar(array $row, array $empresasMap = []): array {
        require_once __DIR__ . '/Designers.php';
        $cdLote   = (int)$row['CD_LOTE'];
        $cdStatus = (int)($row['STATUS_LOTE'] ?? 3);
        $dsItens  = $row['DS_ITENS'] ?? 'Lote têxtil';
        $pesoKg   = (float)($row['PESO_LOTE'] ?? 1.0);

        $state = Auth::getState();
        $meta  = $state['lotesMeta'][(string)$cdLote] ?? [];

        if (!empty($row['BRIEFING'])) {
            $rawBriefing = trim($row['BRIEFING']);
            if (strpos($rawBriefing, '{') === 0) {
                $decoded = json_decode($rawBriefing, true);
                if (is_array($decoded)) {
                    $meta = array_merge($decoded, $meta);
                }
            } elseif (empty($meta['briefing']['ideiaMarca'])) {
                $meta['briefing']['ideiaMarca'] = $rawBriefing;
            }
        }

        $empresaDefault = reset($empresasMap) ?: Empresas::obterAtual();
        $defaultCnpj    = $empresaDefault['cnpj'] ?? '12345678000190';
        $empresaId      = $meta['empresaId'] ?? $defaultCnpj;
        if (stripos($empresaId, 'EMP-') === 0 || (!empty($empresasMap) && !isset($empresasMap[$empresaId]))) {
            $empLookup = Empresas::obterPorId($empresaId);
            if ($empLookup) {
                $empresasMap[$empLookup['id']] = $empLookup;
                $empresaId = $empLookup['id'];
            } else {
                $empresaId = $defaultCnpj;
            }
        }
        $empresa = $empresasMap[$empresaId] ?? Empresas::obterPorId($empresaId) ?? $empresaDefault;

        $statusStr = self::codigoBancoParaStatus($cdStatus, $meta['status'] ?? null);
        $codigo    = $meta['codigo'] ?? ('L' . str_pad((string)$cdLote, 3, '0', STR_PAD_LEFT) . date('dmY'));
        $titulo    = $meta['titulo'] ?? $dsItens;
        $briefing  = array_merge([
            'ideiaMarca'        => $dsItens,
            'expectativa'       => 'Reaproveitamento criativo',
            'liberdadeCriativa' => 'Livre',
            'prazoProducaoDias' => 30,
        ], is_array($meta['briefing'] ?? null) ? $meta['briefing'] : []);

        // Cartilha padrão vinculada à versão vigente quando o lote foi criado (BE-05.2, BE-05.3, BE-07.4)
        $cartilhaLote = $meta['cartilhaPadrao'] ?? ($empresa['cartilhaPadrao'] ?? [
            'versao'       => 'v1.0',
            'conteudo'     => 'Acabamento limpo e higienização adequada.',
            'atualizadoEm' => '',
        ]);

        $criadoEm  = $meta['criadoEm'] ?? date('c');
        $aceitaRet = $empresa ? !empty($empresa['aceitaRetirada']) : true;

        // Verifica se há confeccionista logado fora de SP (BE-21.5 e BE-21.6)
        $sessaoAtual = Auth::obterSessaoRequisicao();
        $ufDesignerLogado = 'SP';
        if (($sessaoAtual['perfil'] ?? '') === 'designer') {
            $docLogado = Designers::extrairDocumento((string)($sessaoAtual['usuario']['documento'] ?? $sessaoAtual['id'] ?? ''));
            if ($docLogado !== '') {
                $dObj = Designers::obterPorId($docLogado, false);
                $ufDesignerLogado = strtoupper($dObj['uf'] ?? 'SP');
            }
        }

        if ($ufDesignerLogado !== 'SP') {
            $logisticaAceita = ['retirada'];
            $envioDisponivel = false;
        } else {
            $logisticaAceita = $aceitaRet ? ['retirada', 'envio'] : ['envio'];
            $envioDisponivel = true;
        }

        // Dados de reserva/confeccionista para a empresa (BE-06.8, BE-19.7)
        $designerId        = $meta['designerId'] ?? null;
        $nomeConfeccionista = null;
        $confeccionistaInfo = null;
        if (!empty($designerId)) {
            $dRow = Designers::obterPorId((string)$designerId, true);
            $nomeConfeccionista = $dRow['nome'] ?? 'Confeccionista';
            $confeccionistaInfo = [
                'id'             => $designerId,
                'documento'      => $designerId,
                'nome'           => $nomeConfeccionista,
                'nota'           => $dRow['nota'] ?? 5.0,
                'restricaoAtiva' => $dRow['restricaoAtiva'] ?? false,
            ];
        }

        $reservadoEm = $meta['reservadoEm'] ?? null;
        $dataLimite  = $meta['dataLimite'] ?? ($reservadoEm ? Auth::adicionarDiasUteis($reservadoEm, 10)->format('Y-m-d') : null);
        $modalidade  = strtolower($meta['tipoLogistica'] ?? 'retirada') === 'envio' ? 'envio' : 'retirada';

        $ehNovo = (time() - (strtotime($criadoEm) ?: time())) <= (48 * 3600);

        return [
            'id'                  => (string)$cdLote,
            'cdLote'              => $cdLote,
            'CD_LOTE'             => (string)$cdLote,
            'STATUS_LOTE'         => (string)$cdStatus,
            'DS_ITENS'            => $dsItens,
            'PESO_LOTE'           => (string)$pesoKg,
            'codigo'              => $codigo,
            'titulo'              => $titulo,
            'descricao'           => $dsItens,
            'pesoKg'              => $pesoKg,
            'peso'                => str_replace('.', ',', (string)$pesoKg) . ' kg',
            'quantidadePecas'     => (int)($meta['quantidadePecas'] ?? 12),
            'composicao'          => $meta['composicao'] ?? '100% têxtil reaproveitado',
            'empresaId'           => $empresaId,
            'lojaId'              => $empresaId,
            'nomeEmpresa'         => $empresa['nomeFantasia'] ?? 'Empresa Parceira',
            'empresaParceira'     => $empresa['nomeFantasia'] ?? 'Empresa Parceira',
            'loja'                => [
                'id'              => $empresaId,
                'nome'            => $empresa['nomeFantasia'] ?? 'Empresa Parceira',
                'sobre'           => $empresa['perfilLoja'] ?? '',
                'endereco'        => trim(($empresa['logradouro'] ?? '') . ', ' . ($empresa['numero'] ?? '') . ' - ' . ($empresa['cidade'] ?? 'São Paulo') . '/' . ($empresa['uf'] ?? 'SP')),
                'horarioRetirada' => $empresa['horarioRetirada'] ?? 'Seg a Sex das 10h às 18h',
                'frete'           => $empresa['frete'] ?? '',
                'uf'              => $empresa['uf'] ?? 'SP',
            ],
            'perfil_loja'         => $empresa['perfilLoja'] ?? '',
            'status'              => $statusStr,
            'status_lote'         => $statusStr,
            'briefing'            => $briefing,
            'cartilhaPadrao'      => $cartilhaLote,
            'direcao'             => $briefing['ideiaMarca'] ?: $dsItens,
            'doacoesVinculadas'   => $meta['doacoesVinculadas'] ?? [],
            'criadoEm'            => $criadoEm,
            'publicado_em'        => $criadoEm,
            'eh_novo'             => $ehNovo,
            'reservadoEm'         => $reservadoEm,
            'reservado_em'        => $reservadoEm,
            'dataLimite'          => $dataLimite,
            'prazo_entrega'       => $dataLimite,
            'termoDataLimite'     => $dataLimite,
            'designerId'          => $designerId,
            'confeccionistaId'    => $designerId,
            'nomeConfeccionista'  => $nomeConfeccionista,
            'designer_nome'       => $nomeConfeccionista,
            'confeccionista'      => $confeccionistaInfo,
            'modalidade'          => $modalidade,
            'tipoLogistica'       => strtoupper($meta['tipoLogistica'] ?? 'RETIRADA'),
            'codigoRastreio'      => $meta['codigoRastreio'] ?? null,
            'dataEnvio'           => $meta['dataEnvio'] ?? null,
            'retiradaConfirmadaEm'=> $meta['retiradaConfirmadaEm'] ?? null,
            'entregaRegistrada'   => !empty($meta['entregaRegistrada']),
            'recebidoEm'          => $meta['recebidoEm'] ?? null,
            'distancia'           => '3,2 km',
            'material'            => $meta['material'] ?? self::inferirMaterial($dsItens . ' ' . $titulo),
            'tipo'                => 'tecido',
            'logistica_aceita'    => $logisticaAceita,
            'envioDisponivel'     => $envioDisponivel,
        ];
    }

    private static function mapaEmpresas(): array {
        $todas = Empresas::listarTodas();
        $map = [];
        foreach ($todas as $e) {
            $map[$e['id']] = $e;
        }
        return $map;
    }

    public static function listarTodos(): array {
        $conn = Database::getConnection();
        $sql  = "SELECT CD_LOTE, STATUS_LOTE, DS_ITENS, PESO_LOTE, BRIEFING FROM LOTES ORDER BY CD_LOTE";
        $stmt = oci_parse($conn, $sql);
        oci_execute($stmt);

        $empMap = self::mapaEmpresas();
        $lotes  = [];
        while ($linha = oci_fetch_assoc($stmt)) {
            $lotes[] = self::formatar($linha, $empMap);
        }
        oci_free_statement($stmt);
        return $lotes;
    }

    public static function listarVitrineSP(?string $uf = 'SP', array $filtros = []): array {
        $todos    = self::listarTodos();
        $empMap   = self::mapaEmpresas();
        $ufFiltro = strtoupper(trim($uf ?: 'SP'));

        $filtroEmpresa  = trim((string)($filtros['empresaId'] ?? $filtros['lojaId'] ?? $filtros['empresa'] ?? ''));
        $filtroMaterial = mb_strtolower(trim((string)($filtros['material'] ?? '')), 'UTF-8');
        $filtroLog      = mb_strtolower(trim((string)($filtros['logistica'] ?? $filtros['modalidade'] ?? '')), 'UTF-8');
        $filtroBusca    = mb_strtolower(trim((string)($filtros['busca'] ?? $filtros['q'] ?? '')), 'UTF-8');

        $vitrine = [];
        foreach ($todos as $lote) {
            if ($lote['status'] !== 'DISPONÍVEL') {
                continue;
            }
            $emp = $empMap[$lote['empresaId']] ?? Empresas::obterPorId($lote['empresaId']);
            if (!$emp) {
                continue;
            }
            // Regra BE-21.1: apenas lojas da UF solicitada (SP)
            if (strtoupper($emp['uf'] ?? 'SP') !== $ufFiltro) {
                continue;
            }
            // Regra BE-21.2 e BE-21.3: apenas lojas com assinatura ATIVA
            if (($emp['assinatura']['status'] ?? '') !== 'ATIVA') {
                continue;
            }
            // Regra BE-07.1: filtro por empresa
            if ($filtroEmpresa !== '' && strtolower($filtroEmpresa) !== 'todas') {
                $empDigits = Auth::onlyDigits($filtroEmpresa);
                $matchCnpj = ($empDigits !== '' && Auth::onlyDigits($lote['empresaId']) === $empDigits);
                $matchNome = (mb_stripos($lote['nomeEmpresa'], $filtroEmpresa) !== false);
                if (!$matchCnpj && !$matchNome) {
                    continue;
                }
            }
            // Regra BE-07.2: filtro por material
            if ($filtroMaterial !== '' && $filtroMaterial !== 'todos') {
                $matLote = mb_strtolower($lote['material'] ?? '', 'UTF-8');
                $descLote = mb_strtolower(($lote['descricao'] ?? '') . ' ' . ($lote['titulo'] ?? ''), 'UTF-8');
                if (strpos($matLote, $filtroMaterial) === false && strpos($descLote, $filtroMaterial) === false) {
                    continue;
                }
            }
            // Regra BE-07.3: filtro por modalidade logística
            if ($filtroLog !== '' && $filtroLog !== 'todas') {
                $aceitas = array_map(fn($x) => mb_strtolower((string)$x, 'UTF-8'), $lote['logistica_aceita'] ?? []);
                if (!in_array($filtroLog, $aceitas, true)) {
                    continue;
                }
            }
            // Busca textual
            if ($filtroBusca !== '') {
                $haystack = mb_strtolower(($lote['codigo'] ?? '') . ' ' . ($lote['titulo'] ?? '') . ' ' . ($lote['descricao'] ?? '') . ' ' . ($lote['nomeEmpresa'] ?? ''), 'UTF-8');
                if (strpos($haystack, $filtroBusca) === false) {
                    continue;
                }
            }

            $lote['empresaParceira'] = $emp;
            $vitrine[] = $lote;
        }
        return $vitrine;
    }

    public static function obterPorCodigoOuId($codigoOuId): ?array {
        $alvo = trim((string)$codigoOuId);
        if ($alvo === '') {
            return null;
        }

        $todos = self::listarTodos();
        $idNum = self::extrairIdNumerico($alvo);

        foreach ($todos as $lote) {
            if (
                strcasecmp($lote['id'], $alvo) === 0 ||
                strcasecmp($lote['codigo'], $alvo) === 0 ||
                ($idNum !== null && (int)$lote['cdLote'] === $idNum)
            ) {
                return $lote;
            }
        }
        return null;
    }

    public static function listarPorEmpresa(string $empresaIdParam): array {
        $emp = Empresas::obterPorId($empresaIdParam) ?? Empresas::obterAtual();
        $cnpjAlvo = $emp['cnpj'] ?? '12345678000190';
        $todos = self::listarTodos();

        $filtrados = [];
        foreach ($todos as $lote) {
            if ($lote['empresaId'] === $cnpjAlvo) {
                $filtrados[] = $lote;
            }
        }
        return $filtrados;
    }

    public static function listarPorDesigner(string $designerIdParam): array {
        require_once __DIR__ . '/Designers.php';
        $doc = Designers::extrairDocumento($designerIdParam);
        if ($doc === '') {
            $atual = Designers::obterAtual(false);
            $doc = $atual['documento'] ?? '';
        }

        $state = Auth::getState();
        $todos = self::listarTodos();
        $meus  = [];

        foreach ($todos as $lote) {
            $cd = (string)$lote['cdLote'];
            $meta = $state['lotesMeta'][$cd] ?? [];
            if (($meta['designerId'] ?? '') === $doc) {
                $lote['reserva'] = [
                    'id'              => 'RES-' . $cd,
                    'idLote'          => $cd,
                    'loteId'          => $cd,
                    'idDesigner'      => $doc,
                    'confeccionistaId'=> $doc,
                    'status'          => $lote['status'] === 'RESERVADO' ? 'ATIVA' : 'CONCLUÍDA',
                    'tipoLogistica'   => $meta['tipoLogistica'] ?? 'RETIRADA',
                    'dataLimite'      => $lote['dataLimite'],
                    'criadoEm'        => $meta['reservadoEm'] ?? $lote['criadoEm'],
                ];
                $meus[] = $lote;
            }
        }

        return $meus;
    }

    public static function registrarRastreamento(int $cdLote, int $cdStatus, string $descricao): void {
        $conn = Database::getConnection();
        $idRast = 'RAST-' . $cdLote . '-' . substr(md5($cdLote . ':' . $cdStatus . ':' . microtime(true)), 0, 8);
        $descTrunc = mb_substr($descricao, 0, 200);
        $stmt = oci_parse($conn, "
            INSERT INTO RASTREAMENTO (ID_RASTREAMENTO, ID_EMPRESA, STATUS_LOTE, DESC_RASTREAMENTO, DATA_HORA, CD_LOTE)
            VALUES (:idR, 1, :st, :ds, SYSTIMESTAMP, :cd)
        ");
        oci_bind_by_name($stmt, ':idR', $idRast);
        oci_bind_by_name($stmt, ':st', $cdStatus);
        oci_bind_by_name($stmt, ':ds', $descTrunc);
        oci_bind_by_name($stmt, ':cd', $cdLote);
        @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($stmt);
    }

    public static function criar(
        $arg1,
        $statusLote = null,
        $descricaoItens = null,
        $pesoLote = null
    ) {
        $conn = Database::getConnection();

        if (is_array($arg1)) {
            $dados = $arg1;
        } else {
            $dados = [
                'cdLote'         => $arg1,
                'statusLote'     => $statusLote,
                'descricaoItens' => $descricaoItens,
                'pesoLote'       => $pesoLote,
            ];
        }

        if (isset($dados['quantidadeLotes']) || isset($dados['batch'])) {
            $qtdBatch = (int)($dados['quantidadeLotes'] ?? $dados['batch'] ?? 1);
            if ($qtdBatch < 1 || $qtdBatch > 100) {
                throw new InvalidArgumentException('A quantidade em lote (batch) deve estar entre 1 e 100.');
            }
        }

        if (!empty($dados['cdLote']) && is_numeric($dados['cdLote'])) {
            $cdLote = (int)$dados['cdLote'];
        } else {
            $stmtMax = oci_parse($conn, "SELECT NVL(MAX(CD_LOTE), 100) + 1 AS NEXT_ID FROM LOTES");
            oci_execute($stmtMax);
            $cdLote = (int)(oci_fetch_assoc($stmtMax)['NEXT_ID'] ?? 104);
            oci_free_statement($stmtMax);
        }

        $statusInput = $dados['status'] ?? $dados['statusLote'] ?? 'DISPONÍVEL';
        $cdStatus    = self::statusParaCodigoBanco($statusInput);
        $statusStr   = is_numeric($statusInput) ? self::codigoBancoParaStatus($cdStatus) : (string)$statusInput;

        $titulo      = trim((string)($dados['titulo'] ?? $dados['descricao'] ?? $dados['descricaoItens'] ?? 'Novo lote têxtil'));
        $descricao   = trim((string)($dados['descricao'] ?? $dados['descricaoItens'] ?? $titulo));
        $dsItensCol  = mb_substr($descricao ?: $titulo, 0, 200);
        $peso        = (float)($dados['pesoKg'] ?? $dados['pesoLote'] ?? 1.0);
        $qtdPecas    = (int)($dados['quantidadePecas'] ?? 12);

        $empAtual    = !empty($dados['empresaId']) ? Empresas::obterPorId((string)$dados['empresaId']) : null;
        if (!$empAtual) {
            $empAtual = Empresas::obterAtual();
        }
        $empresaCnpj = $empAtual['cnpj'] ?? '12345678000190';
        $codigo      = trim((string)($dados['codigo'] ?? ('L' . str_pad((string)$cdLote, 3, '0', STR_PAD_LEFT) . date('dmY'))));
        $briefing    = is_array($dados['briefing'] ?? null) ? $dados['briefing'] : [
            'ideiaMarca'        => is_string($dados['briefing'] ?? null) ? $dados['briefing'] : $dsItensCol,
            'expectativa'       => 'Reaproveitamento criativo',
            'liberdadeCriativa' => 'Livre',
            'prazoProducaoDias' => 30,
        ];

        // Herda snapshot da versão vigente da cartilha da empresa no momento da criação (BE-05.2 e BE-05.3)
        $cartilhaVigente = $empAtual['cartilhaPadrao'] ?? [
            'versao'       => 'v1.0',
            'conteudo'     => 'Acabamento limpo e higienização adequada.',
            'atualizadoEm' => date('c'),
        ];

        $metaPayload = [
            'codigo'          => $codigo,
            'titulo'          => $titulo,
            'empresaId'       => $empresaCnpj,
            'quantidadePecas' => $qtdPecas,
            'status'          => $statusStr,
            'briefing'        => $briefing,
            'cartilhaPadrao'  => $cartilhaVigente,
            'criadoEm'        => date('c'),
        ];
        $briefingCol = mb_substr(json_encode([
            'codigo'    => $codigo,
            'titulo'    => $titulo,
            'empresaId' => $empresaCnpj,
            'status'    => $statusStr,
        ], JSON_UNESCAPED_UNICODE), 0, 500);

        $sql = "INSERT INTO LOTES (CD_LOTE, STATUS_LOTE, DS_ITENS, PESO_LOTE, BRIEFING)
                VALUES (:cdLote, :statusLote, :descricaoItens, :pesoLote, :briefing)";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':cdLote', $cdLote);
        oci_bind_by_name($stmt, ':statusLote', $cdStatus);
        oci_bind_by_name($stmt, ':descricaoItens', $dsItensCol);
        oci_bind_by_name($stmt, ':pesoLote', $peso);
        oci_bind_by_name($stmt, ':briefing', $briefingCol);

        $executed = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$executed) {
            $error = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($error['message'] ?? 'Erro ao inserir lote no banco');
        }
        oci_free_statement($stmt);

        $doacoesVinculadas = is_array($dados['doacoesVinculadas'] ?? null) ? $dados['doacoesVinculadas'] : [];
        foreach ($doacoesVinculadas as $doaRef) {
            $idDoa = (int)preg_replace('/\D/', '', (string)$doaRef);
            if ($idDoa > 0) {
                $updDoa = oci_parse($conn, "
                    UPDATE DOACAO
                       SET ID_LOTE = :cdLote,
                           ST_CURADORIA = 'EM_LOTE',
                           DT_VINCULO_LOTE = SYSTIMESTAMP
                     WHERE ID_DOACAO = :idDoa
                ");
                oci_bind_by_name($updDoa, ':cdLote', $cdLote);
                oci_bind_by_name($updDoa, ':idDoa', $idDoa);
                @oci_execute($updDoa, OCI_COMMIT_ON_SUCCESS);
                oci_free_statement($updDoa);
            }
        }

        $metaPayload['doacoesVinculadas'] = $doacoesVinculadas;
        $state = Auth::getState();
        $state['lotesMeta'][(string)$cdLote] = $metaPayload;
        Auth::saveState($state);

        self::registrarRastreamento($cdLote, $cdStatus, 'Lote cadastrado e publicado na plataforma por ' . ($empAtual['nomeFantasia'] ?? 'Empresa Parceira') . '.');

        return self::obterPorCodigoOuId($cdLote);
    }

    public static function atualizar(string $idParam, array $dados, bool $permitirMudancaStatusInterna = false): array {
        $atual = self::obterPorCodigoOuId($idParam);
        if (!$atual) {
            throw new RuntimeException('Lote não encontrado.');
        }

        $cdLote = (int)$atual['cdLote'];

        // Regra BE-03.1 e BE-03.3: Bloqueia alteração direta de status pelo endpoint de edição de lote
        if (!$permitirMudancaStatusInterna && isset($dados['status'])) {
            $novoSt = trim((string)$dados['status']);
            if ($novoSt !== '' && strcasecmp($novoSt, $atual['status']) !== 0) {
                throw new InvalidArgumentException('Não é permitido alterar o status do lote diretamente pelo endpoint de edição. Utilize o serviço de transição correspondente.');
            }
        }

        // Se estiver enviando codigoRastreio para lote RESERVADO -> registra envio (BE-09.2)
        if (!$permitirMudancaStatusInterna && !empty($dados['codigoRastreio']) && count(array_intersect(array_keys($dados), ['titulo', 'descricao', 'pesoKg'])) === 0) {
            return self::registrarEnvio($idParam, $dados);
        }

        // Regra BE-08.7: Permite atualizar modalidade logística após a reserva enquanto o lote está RESERVADO
        $apenasLogistica = !$permitirMudancaStatusInterna
            && (isset($dados['tipoLogistica']) || isset($dados['modalidade']) || isset($dados['dataLimite']))
            && count(array_intersect(array_keys($dados), ['titulo', 'descricao', 'descricaoItens', 'pesoKg', 'pesoLote', 'briefing'])) === 0;

        if ($apenasLogistica) {
            $state = Auth::getState();
            $meta  = $state['lotesMeta'][(string)$cdLote] ?? [];
            if (isset($dados['tipoLogistica']) || isset($dados['modalidade'])) {
                $tp = strtoupper(trim((string)($dados['tipoLogistica'] ?? $dados['modalidade'])));
                $meta['tipoLogistica'] = ($tp === 'ENVIO') ? 'ENVIO' : 'RETIRADA';
            }
            if (isset($dados['dataLimite'])) {
                $meta['dataLimite'] = trim((string)$dados['dataLimite']);
            }
            $state['lotesMeta'][(string)$cdLote] = $meta;
            Auth::saveState($state);
            return self::obterPorCodigoOuId($cdLote);
        }

        // Regra BE-06.4: Editar dados cadastrais do lote só é permitido enquanto está DISPONÍVEL
        if (!$permitirMudancaStatusInterna && $atual['status'] !== 'DISPONÍVEL') {
            throw new DomainException('Não é permitido editar um lote que já está reservado ou em produção.');
        }

        $statusStr = $permitirMudancaStatusInterna && isset($dados['status'])
            ? trim((string)$dados['status'])
            : $atual['status'];
        $cdStatus  = isset($dados['statusLote']) ? (int)$dados['statusLote'] : self::statusParaCodigoBanco($statusStr);

        $titulo    = trim((string)($dados['titulo'] ?? $atual['titulo']));
        $descricao = trim((string)($dados['descricao'] ?? $dados['descricaoItens'] ?? $atual['descricao']));
        $dsItens   = mb_substr($descricao ?: $titulo, 0, 200);
        $peso      = isset($dados['pesoKg']) || isset($dados['pesoLote'])
            ? (float)($dados['pesoKg'] ?? $dados['pesoLote'])
            : (float)$atual['pesoKg'];
        $codigo    = trim((string)($dados['codigo'] ?? $atual['codigo']));
        $briefing  = isset($dados['briefing']) && is_array($dados['briefing'])
            ? array_merge($atual['briefing'], $dados['briefing'])
            : $atual['briefing'];

        $state = Auth::getState();
        $meta  = array_merge($state['lotesMeta'][(string)$cdLote] ?? [], [
            'codigo'          => $codigo,
            'titulo'          => $titulo,
            'empresaId'       => $atual['empresaId'],
            'quantidadePecas' => (int)($dados['quantidadePecas'] ?? $atual['quantidadePecas']),
            'status'          => $statusStr,
            'briefing'        => $briefing,
        ]);
        $briefingCol = mb_substr(json_encode([
            'codigo'    => $codigo,
            'titulo'    => $titulo,
            'empresaId' => $atual['empresaId'],
            'status'    => $statusStr,
        ], JSON_UNESCAPED_UNICODE), 0, 500);

        $conn = Database::getConnection();
        $sql  = "UPDATE LOTES
                    SET STATUS_LOTE = :status,
                        DS_ITENS    = :dsItens,
                        PESO_LOTE   = :peso,
                        BRIEFING    = :briefing
                  WHERE CD_LOTE = :cdLote";
        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ':status', $cdStatus);
        oci_bind_by_name($stmt, ':dsItens', $dsItens);
        oci_bind_by_name($stmt, ':peso', $peso);
        oci_bind_by_name($stmt, ':briefing', $briefingCol);
        oci_bind_by_name($stmt, ':cdLote', $cdLote);

        $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$ok) {
            $err = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($err['message'] ?? 'Erro ao atualizar lote.');
        }
        oci_free_statement($stmt);

        $state['lotesMeta'][(string)$cdLote] = $meta;
        Auth::saveState($state);

        return self::obterPorCodigoOuId($cdLote);
    }

    public static function excluir(string $idParam, bool $forcar = false): void {
        $atual = self::obterPorCodigoOuId($idParam);
        if (!$atual) {
            throw new RuntimeException('Lote não encontrado.');
        }

        // Regra BE-06.6: Lote reservado ou com projeto vinculado não pode ser excluído
        if (!$forcar && $atual['status'] !== 'DISPONÍVEL') {
            throw new DomainException('Não é permitido excluir um lote que já foi reservado ou está em produção.');
        }

        $cdLote = (int)$atual['cdLote'];
        $conn   = Database::getConnection();

        $stmtR = oci_parse($conn, "DELETE FROM RASTREAMENTO WHERE CD_LOTE = :cd");
        oci_bind_by_name($stmtR, ':cd', $cdLote);
        @oci_execute($stmtR, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($stmtR);

        $stmtD = oci_parse($conn, "UPDATE DOACAO SET ID_LOTE = NULL WHERE ID_LOTE = :cd");
        oci_bind_by_name($stmtD, ':cd', $cdLote);
        @oci_execute($stmtD, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($stmtD);

        $stmt = oci_parse($conn, "DELETE FROM LOTES WHERE CD_LOTE = :cd");
        oci_bind_by_name($stmt, ':cd', $cdLote);
        $ok = @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        if (!$ok) {
            $err = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($err['message'] ?? 'Erro ao excluir lote.');
        }
        oci_free_statement($stmt);

        $state = Auth::getState();
        unset($state['lotesMeta'][(string)$cdLote]);
        Auth::saveState($state);
    }

    public static function reservar(string $codigoParam, string $designerIdParam, string $tipoLogistica = 'ENVIO', array $opcoes = []): array {
        require_once __DIR__ . '/Designers.php';

        // Regra BE-08.1: Aceite do termo
        if (array_key_exists('termoAceito', $opcoes) && empty($opcoes['termoAceito'])) {
            throw new InvalidArgumentException('É obrigatório aceitar o termo de responsabilidade para reservar o lote.');
        }

        // Lock exclusivo para evitar corrida em reservas simultâneas (BE-08.4)
        $lockFp = @fopen('/tmp/continuum_reserva.lock', 'c+');
        if ($lockFp) {
            @flock($lockFp, LOCK_EX);
        }

        try {
            $lote = self::obterPorCodigoOuId($codigoParam);
            if (!$lote) {
                throw new RuntimeException('Lote não encontrado.');
            }
            if ($lote['status'] !== 'DISPONÍVEL') {
                throw new DomainException('Este lote já foi reservado ou não está mais disponível.');
            }

            $designer = Designers::obterPorId($designerIdParam, false) ?? Designers::obterAtual(false);
            $docDesigner = $designer['documento'] ?? Designers::extrairDocumento($designerIdParam);
            if ($docDesigner === '') {
                throw new InvalidArgumentException('Designer inválido para reserva.');
            }

            // Regra BE-08.5 (R1): Apenas 1 reserva ativa por vez
            if (!empty($designer['reservaAtiva'])) {
                throw new DomainException('Você já possui uma reserva ativa.');
            }

            $tpLog = strtoupper(trim($tipoLogistica ?: 'RETIRADA'));
            if (!in_array($tpLog, ['RETIRADA', 'ENVIO', 'DEFINIR_DEPOIS'], true)) {
                $tpLog = 'RETIRADA';
            }

            // Regra BE-21.4 e BE-21.7: Envio só para confeccionista com endereço em SP
            $ufDesigner = strtoupper(trim($designer['uf'] ?? 'SP'));
            if ($ufDesigner !== 'SP' && $tpLog === 'ENVIO') {
                throw new InvalidArgumentException('A modalidade de envio está disponível apenas para confeccionistas com endereço em SP. Selecione retirada na loja.');
            }

            // Regra BE-08.6: Se a loja não aceita a modalidade solicitada
            $emp = Empresas::obterPorId($lote['empresaId']);
            if ($tpLog === 'RETIRADA' && $emp && empty($emp['aceitaRetirada'])) {
                throw new InvalidArgumentException('Esta loja não aceita retirada presencial para este lote.');
            }

            $cdLote  = (int)$lote['cdLote'];
            $conn    = Database::getConnection();

            // Calcula data-limite em 10 dias úteis pulando fins de semana e feriados (BE-08.2 e BE-08.3)
            $dataReservaIso = !empty($opcoes['dataBase']) ? (string)$opcoes['dataBase'] : date('c');
            $dtLimiteObj    = Auth::adicionarDiasUteis($dataReservaIso, 10);
            $dataLimiteYmd  = !empty($opcoes['dataLimite']) ? (string)$opcoes['dataLimite'] : $dtLimiteObj->format('Y-m-d');

            // Transação atômica no Oracle sem auto-commit (BE-08.4 e BE-08.8)
            $cdStatus = 2;
            $stmtUpd  = oci_parse($conn, "UPDATE LOTES SET STATUS_LOTE = :st WHERE CD_LOTE = :cd AND STATUS_LOTE = 3");
            oci_bind_by_name($stmtUpd, ':st', $cdStatus);
            oci_bind_by_name($stmtUpd, ':cd', $cdLote);
            $okUpd = @oci_execute($stmtUpd, OCI_NO_AUTO_COMMIT);
            $rowsAffected = $okUpd ? oci_num_rows($stmtUpd) : 0;
            oci_free_statement($stmtUpd);

            if (!$okUpd || $rowsAffected === 0) {
                @oci_rollback($conn);
                throw new DomainException('Este lote acabou de ser reservado por outro confeccionista.');
            }

            if (!empty($opcoes['simularFalha'])) {
                @oci_rollback($conn);
                throw new RuntimeException('Falha simulada após bloqueio do lote; rollback executado.');
            }

            $endereco = mb_substr(
                trim(($designer['logradouro'] ?? 'Endereço cadastrado') . ', ' . ($designer['numero'] ?? 'S/N') . ' - ' . ($designer['cidade'] ?? 'São Paulo')),
                0,
                150
            );
            $stmtRes = oci_parse($conn, "
                INSERT INTO RESERVA (DT_RESERVA, TP_LOGISTICA, ENDERECO_ENTREGA, DT_ENVIO, DT_ENTREGA)
                VALUES (SYSTIMESTAMP, :tp, :end, SYSDATE, TO_DATE(:dtEnt, 'YYYY-MM-DD'))
            ");
            oci_bind_by_name($stmtRes, ':tp', $tpLog);
            oci_bind_by_name($stmtRes, ':end', $endereco);
            oci_bind_by_name($stmtRes, ':dtEnt', $dataLimiteYmd);
            $okRes = @oci_execute($stmtRes, OCI_NO_AUTO_COMMIT);
            oci_free_statement($stmtRes);

            if (!$okRes) {
                @oci_rollback($conn);
                throw new RuntimeException('Erro ao gravar reserva no banco; transação revertida.');
            }

            $idRast = 'RAST-' . $cdLote . '-' . substr(md5($cdLote . ':' . $docDesigner . ':' . microtime(true)), 0, 6);
            $nomeDesigner = $designer['nome'] ?? $docDesigner;
            $descR  = "Lote reservado por {$nomeDesigner} ({$tpLog}). Termo assinado. Data-limite: {$dataLimiteYmd}.";
            $stmtRast = oci_parse($conn, "
                INSERT INTO RASTREAMENTO (ID_RASTREAMENTO, ID_EMPRESA, STATUS_LOTE, DESC_RASTREAMENTO, DATA_HORA, CD_LOTE)
                VALUES (:idR, 1, :st, :ds, SYSTIMESTAMP, :cd)
            ");
            oci_bind_by_name($stmtRast, ':idR', $idRast);
            oci_bind_by_name($stmtRast, ':st', $cdStatus);
            oci_bind_by_name($stmtRast, ':ds', $descR);
            oci_bind_by_name($stmtRast, ':cd', $cdLote);
            $okRast = @oci_execute($stmtRast, OCI_NO_AUTO_COMMIT);
            oci_free_statement($stmtRast);

            if (!$okRast) {
                @oci_rollback($conn);
                throw new RuntimeException('Erro ao registrar rastreamento da reserva.');
            }

            @oci_commit($conn);

            $state = Auth::getState();
            $state['lotesMeta'][(string)$cdLote] = array_merge($state['lotesMeta'][(string)$cdLote] ?? [], [
                'status'              => 'RESERVADO',
                'designerId'          => $docDesigner,
                'tipoLogistica'       => $tpLog,
                'reservadoEm'         => $dataReservaIso,
                'dataLimite'          => $dataLimiteYmd,
                'termoAceito'         => true,
                'entregaRegistrada'   => false,
                'retiradaConfirmadaEm'=> null,
                'codigoRastreio'      => null,
            ]);
            Auth::saveState($state);

            Notificacoes::registrar(
                'RESERVA_CRIADA',
                'empresa',
                $lote['empresaId'],
                'Nova reserva de lote',
                "O lote {$lote['codigo']} foi reservado por {$nomeDesigner} na modalidade {$tpLog}.",
                (string)$cdLote
            );

            return self::obterPorCodigoOuId($cdLote);
        } finally {
            if ($lockFp) {
                @flock($lockFp, LOCK_UN);
                @fclose($lockFp);
            }
        }
    }

    /**
     * BE-09.1: Como empresa, confirma a retirada presencial do lote pelo confeccionista
     */
    public static function confirmarRetirada(string $loteIdParam, array $dados = []): array {
        $lote = self::obterPorCodigoOuId($loteIdParam);
        if (!$lote) {
            throw new RuntimeException('Lote não encontrado.');
        }
        if ($lote['status'] !== 'RESERVADO') {
            throw new InvalidArgumentException('A retirada só pode ser confirmada para lotes com status RESERVADO.');
        }

        $cdLote = (int)$lote['cdLote'];
        $state  = Auth::getState();
        $meta   = $state['lotesMeta'][(string)$cdLote] ?? [];

        $meta['retiradaConfirmadaEm'] = $dados['dataRetirada'] ?? date('c');
        $meta['entregaRegistrada']    = true;
        $meta['tipoLogistica']        = 'RETIRADA';
        $state['lotesMeta'][(string)$cdLote] = $meta;
        Auth::saveState($state);

        self::registrarRastreamento($cdLote, 2, 'Retirada presencial na loja confirmada pela empresa ' . ($lote['nomeEmpresa'] ?? '') . '.');

        return self::obterPorCodigoOuId($cdLote);
    }

    /**
     * BE-09.2: Como empresa, registra o envio com data e código de rastreio
     */
    public static function registrarEnvio(string $loteIdParam, array $dados = []): array {
        $lote = self::obterPorCodigoOuId($loteIdParam);
        if (!$lote) {
            throw new RuntimeException('Lote não encontrado.');
        }
        if (!in_array($lote['status'], ['RESERVADO', 'EM TRANSPORTE PARA O DESIGNER', 'EM TRANSPORTE'], true)) {
            throw new InvalidArgumentException('O envio só pode ser registrado para lotes reservados.');
        }

        $codRastreio = trim((string)($dados['codigoRastreio'] ?? ''));
        if ($codRastreio === '') {
            throw new InvalidArgumentException('O código de rastreio é obrigatório para registrar o envio.');
        }

        $cdLote   = (int)$lote['cdLote'];
        $dataEnv  = trim((string)($dados['dataEnvio'] ?? date('Y-m-d')));
        $state    = Auth::getState();
        $meta     = $state['lotesMeta'][(string)$cdLote] ?? [];

        $meta['status']            = 'EM TRANSPORTE PARA O DESIGNER';
        $meta['tipoLogistica']     = 'ENVIO';
        $meta['codigoRastreio']    = $codRastreio;
        $meta['dataEnvio']         = $dataEnv;
        $meta['entregaRegistrada'] = true;
        $state['lotesMeta'][(string)$cdLote] = $meta;
        Auth::saveState($state);

        self::registrarRastreamento($cdLote, 2, "Lote despachado pela loja. Código de rastreio: {$codRastreio} ({$dataEnv}).");

        if (!empty($meta['designerId'])) {
            Notificacoes::registrar(
                'ENVIO_REGISTRADO',
                'designer',
                (string)$meta['designerId'],
                'Seu lote foi enviado!',
                "O lote {$lote['codigo']} foi postado com o código de rastreio {$codRastreio}.",
                (string)$cdLote
            );
        }

        return self::obterPorCodigoOuId($cdLote);
    }

    /**
     * BE-09.3, BE-09.4, BE-09.5: Como confeccionista, confirma o recebimento do lote
     */
    public static function confirmarRecebimento(string $loteIdParam, ?string $designerAutenticadoDoc = null): array {
        require_once __DIR__ . '/Designers.php';
        require_once __DIR__ . '/Projetos.php';

        $lote = self::obterPorCodigoOuId($loteIdParam);
        if (!$lote) {
            throw new RuntimeException('Lote não encontrado.');
        }

        $cdLote = (int)$lote['cdLote'];
        $state  = Auth::getState();
        $meta   = $state['lotesMeta'][(string)$cdLote] ?? [];
        $donoReserva = Designers::extrairDocumento((string)($meta['designerId'] ?? ''));

        // Regra BE-09.5: Apenas o confeccionista dono da reserva pode confirmar o recebimento
        if ($designerAutenticadoDoc !== null && $designerAutenticadoDoc !== '' && $donoReserva !== '') {
            if (Designers::extrairDocumento($designerAutenticadoDoc) !== $donoReserva) {
                throw new DomainException('Você não tem permissão para confirmar o recebimento de um lote reservado por outro confeccionista.');
            }
        }

        // Regra BE-09.4: Exige entrega/retirada ou envio registrado pela loja antes do recebimento
        $entregaOuEnvioOk = !empty($meta['entregaRegistrada'])
            || !empty($meta['retiradaConfirmadaEm'])
            || !empty($meta['codigoRastreio'])
            || in_array($lote['status'], ['EM TRANSPORTE PARA O DESIGNER', 'EM TRANSPORTE'], true);

        if (!$entregaOuEnvioOk) {
            throw new InvalidArgumentException('Não é possível confirmar o recebimento antes de a loja registrar a retirada ou o envio do lote.');
        }

        $cdStatus = 4;
        $conn     = Database::getConnection();

        $stmt = oci_parse($conn, "UPDATE LOTES SET STATUS_LOTE = :st WHERE CD_LOTE = :cd");
        oci_bind_by_name($stmt, ':st', $cdStatus);
        oci_bind_by_name($stmt, ':cd', $cdLote);
        @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($stmt);

        $docDesigner = $donoReserva ?: (Designers::obterAtual(false)['documento'] ?? '12345678901');
        $recebidoEm  = date('c');
        $prazoProducaoIso = Auth::adicionarDiasUteis($recebidoEm, 10)->format('Y-m-d');

        $meta['status']        = 'EM PRODUÇÃO';
        $meta['designerId']    = $docDesigner;
        $meta['recebidoEm']    = $recebidoEm;
        $meta['prazoProducao'] = $prazoProducaoIso;
        $state['lotesMeta'][(string)$cdLote] = $meta;
        Auth::saveState($state);

        self::registrarRastreamento($cdLote, $cdStatus, "Recebimento confirmado pelo confeccionista ({$docDesigner}). Lote em produção.");

        Projetos::garantirProjetoParaLote($cdLote, $docDesigner, $lote['titulo'], $lote['descricao']);

        Notificacoes::registrar(
            'RECEBIMENTO_CONFIRMADO',
            'empresa',
            $lote['empresaId'],
            'Material recebido pelo confeccionista',
            "O confeccionista confirmou o recebimento do lote {$lote['codigo']}. Projeto em produção.",
            (string)$cdLote
        );

        return self::obterPorCodigoOuId($cdLote);
    }

    /**
     * BE-10.1 a BE-10.5: Job diário de expiração de reservas com prazo vencido
     */
    public static function executarJobExpiracaoReservas(): array {
        $todos = self::listarTodos();
        $state = Auth::getState();
        $conn  = Database::getConnection();
        $hojeYmd = date('Y-m-d');
        $agoraTs = time();

        $expirados = [];

        foreach ($todos as $lote) {
            if ($lote['status'] !== 'RESERVADO') {
                continue;
            }
            $cdLote = (int)$lote['cdLote'];
            $meta   = $state['lotesMeta'][(string)$cdLote] ?? [];

            $dataLimite  = $meta['dataLimite'] ?? null;
            $reservadoEm = $meta['reservadoEm'] ?? null;

            $vencido = false;
            if ($dataLimite && $dataLimite < $hojeYmd) {
                $vencido = true;
            } elseif ($reservadoEm && (strtotime($reservadoEm) < ($agoraTs - 7 * 86400))) {
                $vencido = true;
            }

            if (!$vencido) {
                continue;
            }

            $docAntigo = $meta['designerId'] ?? '';

            // Devolve o lote para DISPONÍVEL (STATUS_LOTE = 3)
            $cdStatus = 3;
            $stmt = oci_parse($conn, "UPDATE LOTES SET STATUS_LOTE = :st WHERE CD_LOTE = :cd");
            oci_bind_by_name($stmt, ':st', $cdStatus);
            oci_bind_by_name($stmt, ':cd', $cdLote);
            @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
            oci_free_statement($stmt);

            $meta['status']               = 'DISPONÍVEL';
            $meta['designerId']           = null;
            $meta['reservadoEm']          = null;
            $meta['dataLimite']           = null;
            $meta['retiradaConfirmadaEm'] = null;
            $meta['entregaRegistrada']    = false;
            $meta['expiradoEm']           = date('c');
            $state['lotesMeta'][(string)$cdLote] = $meta;

            self::registrarRastreamento($cdLote, $cdStatus, "Reserva expirada automaticamente por prazo vencido. Lote retornado à vitrine.");

            if ($docAntigo !== '') {
                Notificacoes::registrar(
                    'PRAZO_VENCIDO',
                    'designer',
                    $docAntigo,
                    'Reserva expirada por prazo vencido',
                    "O prazo de retirada do lote {$lote['codigo']} venceu e o lote retornou à vitrine.",
                    'EXP-' . $cdLote . '-' . $hojeYmd
                );
            }
            Notificacoes::registrar(
                'PRAZO_VENCIDO',
                'empresa',
                $lote['empresaId'],
                'Reserva de lote expirada',
                "A reserva do lote {$lote['codigo']} venceu sem retirada e ele voltou para DISPONÍVEL.",
                'EXP-EMP-' . $cdLote . '-' . $hojeYmd
            );

            $expirados[] = [
                'id'             => (string)$cdLote,
                'codigo'         => $lote['codigo'],
                'designerAntigo' => $docAntigo,
                'novoStatus'     => 'DISPONÍVEL',
            ];
        }

        Auth::saveState($state);

        return [
            'quantidadeExpirada' => count($expirados),
            'lotesExpirados'     => $expirados,
            'executadoEm'        => date('c'),
        ];
    }

    /**
     * BE-06.7 e BE-19.1 a BE-19.8: Cancelamento de reserva ou produção com motivo obrigatório e recálculo de nota
     */
    public static function cancelar(string $loteIdParam, array $dados): array {
        require_once __DIR__ . '/Designers.php';
        require_once __DIR__ . '/Projetos.php';

        $lote = self::obterPorCodigoOuId($loteIdParam);
        if (!$lote) {
            throw new RuntimeException('Lote não encontrado.');
        }

        // Regra BE-06.7, BE-19.1 e BE-19.3: Motivo é estritamente obrigatório (sem default silencioso)
        $motivo = trim((string)($dados['motivo'] ?? ''));
        $texto  = trim((string)($dados['texto'] ?? $dados['justificativa'] ?? $motivo));
        if ($motivo === '' || $texto === '') {
            throw new InvalidArgumentException('Motivo e justificativa do cancelamento são obrigatórios.');
        }

        $cdLote     = (int)$lote['cdLote'];
        $jaRecebido = in_array($lote['status'], ['EM PRODUÇÃO', 'EM AJUSTE'], true);
        $conn       = Database::getConnection();

        $state       = Auth::getState();
        $meta        = $state['lotesMeta'][(string)$cdLote] ?? [];
        $docDesigner = $meta['designerId'] ?? (Designers::obterAtual(false)['documento'] ?? '12345678901');

        // Registra motivo em MOTIVO_CANCELAMENTO e evento em CANCELAMENTO
        $motivoTrunc = mb_substr($motivo, 0, 200);
        $stmtM = oci_parse($conn, "SELECT ID_MOTIVO FROM MOTIVO_CANCELAMENTO WHERE UPPER(TRIM(DS_MOTIVO)) = UPPER(:ds)");
        oci_bind_by_name($stmtM, ':ds', $motivoTrunc);
        oci_execute($stmtM);
        $mRow = oci_fetch_assoc($stmtM);
        oci_free_statement($stmtM);

        if ($mRow) {
            $idMotivo = (int)$mRow['ID_MOTIVO'];
        } else {
            $insM = oci_parse($conn, "INSERT INTO MOTIVO_CANCELAMENTO (DS_MOTIVO) VALUES (:ds)");
            oci_bind_by_name($insM, ':ds', $motivoTrunc);
            @oci_execute($insM, OCI_COMMIT_ON_SUCCESS);
            oci_free_statement($insM);

            $stmtM2 = oci_parse($conn, "SELECT MAX(ID_MOTIVO) AS ID_MOTIVO FROM MOTIVO_CANCELAMENTO");
            oci_execute($stmtM2);
            $idMotivo = (int)(oci_fetch_assoc($stmtM2)['ID_MOTIVO'] ?? 1);
            oci_free_statement($stmtM2);
        }

        $proj = Projetos::garantirProjetoParaLote($cdLote, $docDesigner, $lote['titulo'], $lote['descricao']);
        $idProj = (int)($proj['id'] ?? 1);
        $momento = $jaRecebido ? 'POS_RECEBIMENTO' : 'PRE_RECEBIMENTO';
        $justificativa = mb_substr($texto, 0, 1000);

        $insC = oci_parse($conn, "
            INSERT INTO CANCELAMENTO (ID_PROJETO, MOMENTO, ID_MOTIVO, DS_JUSTIFICATIVA)
            VALUES (:idP, :mom, :idM, :just)
        ");
        oci_bind_by_name($insC, ':idP', $idProj);
        oci_bind_by_name($insC, ':mom', $momento);
        oci_bind_by_name($insC, ':idM', $idMotivo);
        oci_bind_by_name($insC, ':just', $justificativa);
        @oci_execute($insC, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($insC);

        // Regra BE-19.2 vs BE-19.4:
        // - Antes do recebimento (PRE_RECEBIMENTO): reserva é cancelada e o lote volta para DISPONÍVEL!
        // - Durante a produção (POS_RECEBIMENTO): lote e projeto vão para INTERROMPIDO e cria restrição!
        if ($jaRecebido) {
            $novoStatusLote = 'INTERROMPIDO';
            $cdStatus = 1;
        } else {
            $novoStatusLote = 'DISPONÍVEL';
            $cdStatus = 3;
        }

        $stmt = oci_parse($conn, "UPDATE LOTES SET STATUS_LOTE = :st WHERE CD_LOTE = :cd");
        oci_bind_by_name($stmt, ':st', $cdStatus);
        oci_bind_by_name($stmt, ':cd', $cdLote);
        @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
        oci_free_statement($stmt);

        $state = Auth::getState();
        $meta['status'] = $novoStatusLote;
        $meta['cancelamento'] = [
            'motivo'  => $motivo,
            'texto'   => $texto,
            'momento' => $momento,
            'data'    => date('c'),
        ];
        if (!$jaRecebido) {
            $meta['designerId']           = null;
            $meta['reservadoEm']          = null;
            $meta['dataLimite']           = null;
            $meta['entregaRegistrada']    = false;
            $meta['retiradaConfirmadaEm'] = null;
        }
        $state['lotesMeta'][(string)$cdLote] = $meta;

        // Cálculo da nota conforme AN-18 (BE-19.5):
        // Pré-recebimento reduz 0.5; pós-recebimento reduz 1.0 e ativa restrição
        $dMeta = $state['designersMeta'][$docDesigner] ?? [];
        $notaAtual = (float)($dMeta['nota'] ?? 5.0);
        $penalidade = $jaRecebido ? 1.0 : 0.5;
        $dMeta['nota'] = max(1.0, round($notaAtual - $penalidade, 1));
        if ($jaRecebido) {
            $dMeta['restricaoAtiva'] = true;
            $state['projetosMeta'][(string)$idProj]['status'] = 'INTERROMPIDO';
        }
        $state['designersMeta'][$docDesigner] = $dMeta;
        Auth::saveState($state);

        self::registrarRastreamento($cdLote, $cdStatus, "Cancelamento ({$momento}): {$motivo} — {$texto}. Novo status: {$novoStatusLote}.");

        Notificacoes::registrar(
            'CANCELAMENTO_LOTE',
            'empresa',
            $lote['empresaId'],
            'Cancelamento registrado no lote ' . $lote['codigo'],
            "Motivo: {$motivo}. Justificativa: {$texto}. Status do lote: {$novoStatusLote}.",
            'CANC-' . $cdLote . '-' . time()
        );

        return self::obterPorCodigoOuId($cdLote);
    }
}
