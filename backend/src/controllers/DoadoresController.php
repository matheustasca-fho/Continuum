<?php

require_once __DIR__ . '/../models/Doadores.php';
require_once __DIR__ . '/../models/Auth.php';

class DoadoresController {

    /**
     * POST /api/doadores
     */
    public function registrar($data) {
        try {
            $novo = Doadores::registrar($data);
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
                'erro'    => 'Falha ao cadastrar doador.',
                'message' => 'Falha ao cadastrar doador.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/doadores?email=... ou ?cpf=... (BE-15.1, BE-15.2)
     */
    public function buscar($params) {
        try {
            Auth::exigirAutenticacao(['empresa', 'doador']);
            $encontrado = Doadores::buscar($params);
            if (!$encontrado) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'erro' => 'Doador não encontrado.', 'message' => 'Doador não encontrado.']);
                return;
            }
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $encontrado
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao buscar doador.',
                'message' => 'Erro ao buscar doador.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/doadores/{cpf} (BE-15.1)
     */
    public function obterPorCpf($params) {
        try {
            $sessao = Auth::exigirAutenticacao(['empresa', 'doador']);
            $cpf = Auth::onlyDigits($params['cpf'] ?? '');
            if (($sessao['perfil'] ?? '') === 'doador') {
                $cpfSessao = Auth::onlyDigits($sessao['usuario']['cpf'] ?? $sessao['id'] ?? '');
                if ($cpfSessao !== '' && $cpf !== $cpfSessao) {
                    http_response_code(403);
                    echo json_encode(['status' => 'error', 'erro' => 'Acesso negado aos dados de outro doador.', 'message' => 'Acesso negado aos dados de outro doador.']);
                    return;
                }
            }
            $doador = Doadores::obterPorCpf($cpf);
            if (!$doador) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'erro' => 'Doador não encontrado.', 'message' => 'Doador não encontrado.']);
                return;
            }
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $doador
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao consultar doador.',
                'message' => 'Erro ao consultar doador.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * PATCH /api/doadores/{cpf}
     */
    public function atualizarPerfil($data) {
        try {
            $sessao = Auth::exigirAutenticacao(['doador']);
            $cpfAlvo = Auth::onlyDigits($data['cpf'] ?? '');
            $cpfSessao = Auth::onlyDigits($sessao['usuario']['cpf'] ?? $sessao['cpf'] ?? $sessao['id'] ?? '');

            if ($cpfAlvo !== '' && $cpfSessao !== '' && $cpfAlvo !== $cpfSessao) {
                http_response_code(403);
                echo json_encode([
                    'status'  => 'error',
                    'erro'    => 'Você não tem permissão para editar o perfil de outro usuário.',
                    'message' => 'Você não tem permissão para editar o perfil de outro usuário.'
                ]);
                return;
            }

            $atualizado = Doadores::atualizarPerfil($cpfAlvo ?: $cpfSessao, $data);
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
                'erro'    => 'Erro ao atualizar perfil do doador.',
                'message' => 'Erro ao atualizar perfil do doador.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/doadores/me
     */
    public function meuPerfil($params) {
        try {
            $sessao = Auth::exigirAutenticacao(['doador']);
            $cpf = Auth::onlyDigits($sessao['usuario']['cpf'] ?? $sessao['cpf'] ?? $sessao['id'] ?? '');
            $doador = $cpf !== '' ? Doadores::obterPorCpf($cpf) : Doadores::obterAtual();
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $doador
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao obter perfil do doador.',
                'message' => 'Erro ao obter perfil do doador.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/doadores/me/estatisticas
     */
    public function minhasEstatisticas($params) {
        try {
            $sessao = Auth::exigirAutenticacao(['doador']);
            $cpf = Auth::onlyDigits($sessao['usuario']['cpf'] ?? $sessao['cpf'] ?? $sessao['id'] ?? '');
            $stats = Doadores::obterEstatisticas($cpf ?: null);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $stats
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao consultar estatísticas do doador.',
                'message' => 'Erro ao consultar estatísticas do doador.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/cupons/{codigo} (BE-15.4, BE-15.5)
     */
    public function validarCupom($params) {
        try {
            $codigo = (string)($params['codigo'] ?? '');
            $cupom = Doadores::buscarCupomPorCodigo($codigo);
            if (!$cupom) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'erro' => 'Cupom não encontrado.', 'message' => 'Cupom não encontrado.']);
                return;
            }
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $cupom
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/cupons/{codigo}/utilizacao (BE-15.5, BE-15.6)
     */
    public function utilizarCupom($params) {
        try {
            $codigo = (string)($params['codigo'] ?? '');
            $cupom = Doadores::utilizarCupom($codigo);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $cupom
            ]);
        } catch (DomainException $e) {
            http_response_code(409);
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
     * POST /api/jobs/limpar-cpfs-nao-vinculados (BE-20.7)
     */
    public function limparCpfsNaoVinculados($params = []) {
        try {
            $res = Doadores::limparCpfsNaoVinculados();
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $res
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'erro' => $e->getMessage(), 'message' => $e->getMessage()]);
        }
    }
}
