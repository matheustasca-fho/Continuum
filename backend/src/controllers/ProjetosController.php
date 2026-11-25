<?php

require_once __DIR__ . '/../models/Projetos.php';
require_once __DIR__ . '/../models/Auth.php';

class ProjetosController {

    /**
     * GET /api/projetos/{id} e GET /api/publico/pecas/{codigo}
     */
    public function obter($params) {
        try {
            $id = (string)($params['id'] ?? $params['codigo'] ?? '');
            $ehQrPublico = Projetos::ehCodigoPublicoQr($id) || !empty($params['publico']);

            if ($ehQrPublico) {
                $peca = Projetos::obterPecaPublica($id);
                if (!$peca) {
                    http_response_code(404);
                    echo json_encode([
                        'status'  => 'error',
                        'erro'    => 'Peça pública não encontrada ou projeto ainda não finalizado.',
                        'message' => 'Peça pública não encontrada ou projeto ainda não finalizado.'
                    ]);
                    return;
                }
                http_response_code(200);
                echo json_encode([
                    'status' => 'success',
                    'data'   => $peca
                ]);
                return;
            }

            $sessao  = Auth::obterSessaoRequisicao();
            $projeto = Projetos::obterPorId($id, $sessao === null);

            if (!$projeto) {
                http_response_code(404);
                echo json_encode([
                    'status'  => 'error',
                    'erro'    => 'Projeto não encontrado.',
                    'message' => 'Projeto não encontrado.'
                ]);
                return;
            }

            // Se acessado sem login (visitante público — BE-13.3 e BE-13.6), só permite visualizar se estiver FINALIZADO
            if ($sessao === null && $projeto['status'] !== 'FINALIZADO') {
                http_response_code(404);
                echo json_encode([
                    'status'  => 'error',
                    'erro'    => 'Projeto ainda não finalizado para visualização pública.',
                    'message' => 'Projeto ainda não finalizado para visualização pública.'
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $projeto
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao consultar projeto.',
                'message' => 'Erro ao consultar projeto.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/projetos/{id}/qrcode e GET /api/publico/pecas/{codigo}/qrcode (BE-13.5)
     */
    public function qrcode($params) {
        try {
            $id = (string)($params['id'] ?? $params['codigo'] ?? '');
            $qr = Projetos::gerarQrCodePublico($id);
            if (!$qr) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'erro' => 'Projeto não encontrado para geração de QR Code.', 'message' => 'Projeto não encontrado para geração de QR Code.']);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $qr
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        }
    }

    /**
     * PATCH /api/projetos/{id}/finalizacao
     */
    public function finalizar($data) {
        try {
            $sessao  = Auth::exigirAutenticacao(['designer']);
            $id      = (string)($data['id'] ?? '');
            $atual   = Projetos::obterPorId($id);
            $docSess = Auth::onlyDigits((string)($sessao['usuario']['documento'] ?? $sessao['id'] ?? ''));
            if ($atual && Auth::onlyDigits((string)($atual['idDesigner'] ?? '')) !== $docSess) {
                http_response_code(403);
                $m = 'Este projeto pertence a outro confeccionista.';
                echo json_encode(['status' => 'error', 'erro' => $m, 'message' => $m]);
                return;
            }
            $projeto = Projetos::finalizarDesigner($id, $data);

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $projeto
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (DomainException $e) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao finalizar projeto.',
                'message' => 'Erro ao finalizar projeto.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * PATCH /api/projetos/{id}/status e PATCH /api/projetos/{id}/conclusao
     */
    public function alterarStatus($data) {
        try {
            $id     = (string)($data['id'] ?? '');
            $status = trim((string)($data['status'] ?? 'FINALIZADO'));

            if ($status === '') {
                http_response_code(422);
                echo json_encode([
                    'status'  => 'error',
                    'erro'    => 'O novo status do projeto é obrigatório.',
                    'message' => 'O novo status do projeto é obrigatório.'
                ]);
                return;
            }

            $projeto = Projetos::alterarStatus($id, $status, $data, false);

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $projeto
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (DomainException $e) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao alterar status do projeto.',
                'message' => 'Erro ao alterar status do projeto.',
                'detail'  => $e->getMessage()
            ]);
        }
    }
}
