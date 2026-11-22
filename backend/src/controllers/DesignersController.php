<?php

require_once __DIR__ . '/../models/Designers.php';
require_once __DIR__ . '/../models/Lotes.php';
require_once __DIR__ . '/../models/Projetos.php';
require_once __DIR__ . '/../models/Auth.php';

class DesignersController {

    private function verificarAcessoDesigner(string $idSolicitado): array {
        $sessao = Auth::exigirAutenticacao(['designer', 'empresa']);
        if (($sessao['perfil'] ?? '') === 'designer') {
            $docSessao = Designers::extrairDocumento((string)($sessao['usuario']['documento'] ?? $sessao['id'] ?? ''));
            $docAlvo   = Designers::extrairDocumento($idSolicitado);
            if ($docAlvo !== '' && $docSessao !== '' && $docAlvo !== $docSessao) {
                http_response_code(403);
                echo json_encode([
                    'status'  => 'error',
                    'erro'    => 'Acesso negado aos dados de outro confeccionista.',
                    'message' => 'Acesso negado aos dados de outro confeccionista.'
                ]);
                exit;
            }
        }
        return $sessao;
    }

    /**
     * POST /api/designers
     */
    public function registrar($data) {
        try {
            $novo = Designers::registrar($data);
            http_response_code(201);
            echo json_encode([
                'status' => 'success',
                'data'   => $novo
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Falha ao cadastrar designer.',
                'message' => 'Falha ao cadastrar designer.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * PATCH /api/designers/{id}
     */
    public function atualizarPerfil($data) {
        try {
            $id = (string)($data['id'] ?? '');
            $sessao = Auth::exigirAutenticacao(['designer']);
            $docSessao = Designers::extrairDocumento((string)($sessao['usuario']['documento'] ?? $sessao['id'] ?? ''));
            $docAlvo   = Designers::extrairDocumento($id);
            if ($docAlvo !== '' && $docSessao !== '' && $docAlvo !== $docSessao) {
                http_response_code(403);
                echo json_encode([
                    'status'  => 'error',
                    'erro'    => 'Você não tem permissão para editar o perfil de outro confeccionista.',
                    'message' => 'Você não tem permissão para editar o perfil de outro confeccionista.'
                ]);
                return;
            }

            $atualizado = Designers::atualizarPerfil($docAlvo ?: $docSessao, $data);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $atualizado
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao atualizar perfil do designer.',
                'message' => 'Erro ao atualizar perfil do designer.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/designers/me
     */
    public function meuPerfil($params) {
        try {
            $sessao = Auth::exigirAutenticacao(['designer']);
            $docSessao = Designers::extrairDocumento((string)($sessao['usuario']['documento'] ?? $sessao['id'] ?? ''));
            $designer = $docSessao !== ''
                ? Designers::obterPorId($docSessao, false)
                : Designers::obterAtual(false);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $designer
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao obter perfil do designer.',
                'message' => 'Erro ao obter perfil do designer.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * PUT /api/designers/me/favoritos/{loteId}
     */
    public function alternarFavorito($data) {
        try {
            Auth::exigirAutenticacao(['designer']);
            $loteId = (string)($data['loteId'] ?? '');
            if ($loteId === '') {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'erro' => 'ID do lote é obrigatório.', 'message' => 'ID do lote é obrigatório.']);
                return;
            }
            $favoritos = Designers::alternarFavorito($loteId);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $favoritos
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao atualizar favoritos.',
                'message' => 'Erro ao atualizar favoritos.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/designers/{id}/lotes
     */
    public function listarMeusLotes($params) {
        try {
            $id = (string)($params['id'] ?? '');
            $this->verificarAcessoDesigner($id);
            $lotes = Lotes::listarPorDesigner($id);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $lotes
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao listar lotes do designer.',
                'message' => 'Erro ao listar lotes do designer.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/designers/{id}/projetos
     */
    public function listarMeusProjetos($params) {
        try {
            $id = (string)($params['id'] ?? '');
            $this->verificarAcessoDesigner($id);
            $projetos = Projetos::listarPorDesigner($id);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $projetos
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao listar projetos do designer.',
                'message' => 'Erro ao listar projetos do designer.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/designers/{id}/dashboard
     */
    public function dashboard($params) {
        try {
            $id = (string)($params['id'] ?? '');
            $this->verificarAcessoDesigner($id);
            $projetos  = Projetos::listarPorDesigner($id);
            $meusLotes = Lotes::listarPorDesigner($id);

            $reservados  = 0;
            $emAndamento = 0;
            $finalizados = 0;
            $kgSalvos    = 0.0;
            $pecas       = 0;
            $pendencias  = [];

            foreach ($meusLotes as $l) {
                if ($l['status'] === 'RESERVADO') {
                    $reservados++;
                    $pendencias[] = [
                        'tipo'   => 'RECEBIMENTO_PENDENTE',
                        'loteId' => $l['id'],
                        'codigo' => $l['codigo'],
                        'texto'  => "Lote \"{$l['titulo']}\" ({$l['codigo']}) aguardando confirmação de recebimento",
                    ];
                }
            }

            foreach ($projetos as $p) {
                if (in_array($p['status'], ['EM PRODUÇÃO', 'EM AJUSTE', 'ENVIADO PARA A LOJA'], true)) {
                    $emAndamento++;
                    $pendencias[] = [
                        'tipo'      => 'PROJETO_EM_ANDAMENTO',
                        'projetoId' => $p['id'],
                        'texto'     => "Projeto \"{$p['tituloPeca']}\" com status {$p['status']}",
                    ];
                } elseif ($p['status'] === 'FINALIZADO') {
                    $finalizados++;
                }
                $kgSalvos += (float)($p['pesoKg'] ?? 0);
                $pecas    += (int)($p['quantidadePecas'] ?? 0);
            }

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => [
                    'stats' => [
                        'reservados'          => $reservados,
                        'em_andamento'        => $emAndamento,
                        'finalizados'         => $finalizados,
                        'kgSalvos'            => round($kgSalvos, 1),
                        'pecasRessignificadas'=> $pecas,
                        'aguaPoupadaLitros'   => round($kgSalvos * Auth::FATOR_AGUA_LITROS_POR_KG, 1),
                        'co2EvitadoKg'        => round($kgSalvos * Auth::FATOR_CO2_KG_POR_KG, 1),
                    ],
                    'pendencias' => $pendencias
                ]
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao carregar estatísticas do designer.',
                'message' => 'Erro ao carregar estatísticas do designer.',
                'detail'  => $e->getMessage()
            ]);
        }
    }
}
