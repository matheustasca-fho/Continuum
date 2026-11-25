<?php

require_once __DIR__ . '/../models/Lotes.php';
require_once __DIR__ . '/../models/Auth.php';

class LotesController {

    private function docDesigner(array $sessao): string {
        return Auth::onlyDigits((string)($sessao['usuario']['documento'] ?? $sessao['id'] ?? ''));
    }

    private function negar(int $codigo, string $mensagem): void {
        http_response_code($codigo);
        echo json_encode(['status' => 'error', 'erro' => $mensagem, 'message' => $mensagem]);
        exit;
    }

    /** Exige login de empresa e que o lote pertença a ela. */
    private function exigirEmpresaDoLote(string $idLote): array {
        $sessao = Auth::exigirAutenticacao(['empresa']);
        $lote = Lotes::obterPorCodigoOuId($idLote);
        if (!$lote) {
            $this->negar(404, 'Lote não encontrado.');
        }
        if (Auth::onlyDigits((string)$lote['empresaId']) !== Auth::onlyDigits((string)($sessao['empresaId'] ?? ''))) {
            $this->negar(403, 'Este lote pertence a outra empresa.');
        }
        return $lote;
    }

    /**
     * GET /api/lotes
     */
    public function listar($params) {
        try {
            $lotes = Lotes::listarTodos();

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $lotes
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao consultar lotes',
                'message' => 'Erro ao consultar lotes',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/lotes/vitrine
     */
    public function listarVitrine($params) {
        try {
            $uf    = isset($params['uf']) ? (string)$params['uf'] : 'SP';
            $lotes = Lotes::listarVitrineSP($uf, is_array($params) ? $params : []);

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $lotes
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao consultar vitrine de lotes.',
                'message' => 'Erro ao consultar vitrine de lotes.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/lotes/{codigo}
     */
    public function obterPorCodigo($params) {
        try {
            $codigo = (string)($params['codigo'] ?? $params['id'] ?? '');
            $lote   = Lotes::obterPorCodigoOuId($codigo);

            if (!$lote) {
                http_response_code(404);
                echo json_encode([
                    'status'  => 'error',
                    'erro'    => 'Lote não encontrado.',
                    'message' => 'Lote não encontrado.'
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $lote
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao consultar lote.',
                'message' => 'Erro ao consultar lote.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/lotes
     */
    public function criar($data) {
        $sessao = Auth::exigirAutenticacao(['empresa']);
        $data['empresaId'] = (string)($sessao['empresaId'] ?? '');
        $temFormatoNovo   = isset($data['titulo']) || isset($data['descricao']) || isset($data['pesoKg']) || isset($data['empresaId']);
        $temFormatoLegado = !empty($data['cdLote']) && !empty($data['statusLote']) && !empty($data['descricaoItens']) && isset($data['pesoLote']);

        if (!$temFormatoNovo && !$temFormatoLegado) {
            http_response_code(422);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Informe os dados do lote (titulo/descricao e pesoKg).',
                'message' => 'Informe os dados do lote (titulo/descricao e pesoKg).'
            ]);
            return;
        }

        try {
            $loteCriado = Lotes::criar($data);

            http_response_code(201);
            echo json_encode([
                'status'  => 'success',
                'message' => 'Lote cadastrado com sucesso!',
                'data'    => $loteCriado
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Falha ao cadastrar o lote',
                'message' => 'Falha ao cadastrar o lote',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * PATCH /api/lotes/{id}
     */
    public function atualizar($data) {
        try {
            $id = (string)($data['id'] ?? '');
            $soLogistica = isset($data['tipoLogistica']) && !array_diff(array_keys($data), ['id', 'tipoLogistica', 'modalidade']);
            $sessao = Auth::obterSessaoRequisicao();
            if ($soLogistica && ($sessao['perfil'] ?? '') === 'designer') {
                // o designer só ajusta a logística do lote que ele mesmo reservou
                $lote = Lotes::obterPorCodigoOuId($id);
                if (!$lote) {
                    $this->negar(404, 'Lote não encontrado.');
                }
                if (Auth::onlyDigits((string)($lote['designerId'] ?? '')) !== $this->docDesigner($sessao)) {
                    $this->negar(403, 'Este lote não está reservado para você.');
                }
            } else {
                $this->exigirEmpresaDoLote($id);
            }
            $atualizado = Lotes::atualizar($id, $data, false);

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $atualizado
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (DomainException $e) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao atualizar lote.',
                'message' => 'Erro ao atualizar lote.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * DELETE /api/lotes/{id}
     */
    public function excluir($params) {
        try {
            $id = (string)($params['id'] ?? '');
            $this->exigirEmpresaDoLote($id);
            Lotes::excluir($id, false);
            http_response_code(204);
        } catch (DomainException $e) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao excluir lote.',
                'message' => 'Erro ao excluir lote.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/lotes/{codigo}/reservas
     */
    public function reservar($data) {
        try {
            $sessao = Auth::exigirAutenticacao(['designer']);
            $doc = $this->docDesigner($sessao);
            $informado = Auth::onlyDigits((string)($data['designerId'] ?? $data['idDesigner'] ?? ''));
            if ($informado !== '' && $informado !== $doc) {
                $this->negar(403, 'Você só pode reservar lotes para o seu próprio cadastro.');
            }
            $codigo        = (string)($data['codigo'] ?? $data['id'] ?? '');
            $tipoLogistica = (string)($data['tipoLogistica'] ?? $data['logistica'] ?? 'RETIRADA');

            // do cliente só vem o aceite do termo: prazo e data-base são sempre calculados pelo servidor
            $lote = Lotes::reservar($codigo, $doc, $tipoLogistica, ['termoAceito' => $data['termoAceito'] ?? null]);
            http_response_code(201);
            echo json_encode([
                'status' => 'success',
                'data'   => $lote
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (DomainException $e) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao reservar lote.',
                'message' => 'Erro ao reservar lote.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * PATCH /api/lotes/{id}/retirada (BE-09.1)
     */
    public function confirmarRetirada($data) {
        try {
            $id   = (string)($data['id'] ?? '');
            $this->exigirEmpresaDoLote($id);
            $lote = Lotes::confirmarRetirada($id, $data);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $lote
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        }
    }

    /**
     * PATCH /api/lotes/{id}/envio e PATCH /api/lotes/{id}/rastreio (BE-09.2)
     */
    public function registrarEnvio($data) {
        try {
            $id   = (string)($data['id'] ?? '');
            $this->exigirEmpresaDoLote($id);
            $lote = Lotes::registrarEnvio($id, $data);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $lote
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        }
    }

    /**
     * PATCH /api/lotes/{id}/recebimento (BE-03.2, BE-09.3, BE-09.4, BE-09.5)
     */
    public function confirmarRecebimento($data) {
        try {
            $sessao = Auth::exigirAutenticacao(['designer']);
            $docSessao = (string)($sessao['usuario']['documento'] ?? $sessao['id'] ?? '');
            $id   = (string)($data['id'] ?? '');
            $lote = Lotes::confirmarRecebimento($id, $docSessao);

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $lote
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
                'erro'    => 'Erro ao confirmar recebimento do lote.',
                'message' => 'Erro ao confirmar recebimento do lote.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/lotes/{id}/cancelamento
     */
    public function cancelar($data) {
        try {
            $sessao = Auth::exigirAutenticacao(['designer']);
            $id   = (string)($data['id'] ?? '');
            $existente = Lotes::obterPorCodigoOuId($id);
            if ($existente && Auth::onlyDigits((string)($existente['designerId'] ?? '')) !== $this->docDesigner($sessao)) {
                $this->negar(403, 'Este lote não está reservado para você.');
            }
            $lote = Lotes::cancelar($id, $data);

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $lote
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
                'erro'    => 'Erro ao cancelar reserva/produção do lote.',
                'message' => 'Erro ao cancelar reserva/produção do lote.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/jobs/expirar-reservas (BE-10.1 a BE-10.5)
     */
    public function expirarReservas($data = []) {
        try {
            $resultado = Lotes::executarJobExpiracaoReservas();
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $resultado
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao executar job de expiração de reservas.',
                'message' => 'Erro ao executar job de expiração de reservas.',
                'detail'  => $e->getMessage()
            ]);
        }
    }
}
