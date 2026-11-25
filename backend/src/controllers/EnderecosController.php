<?php

require_once __DIR__ . '/../models/Enderecos.php';

class EnderecosController {

    /**
     * GET /api/enderecos/cep/{cep}
     */
    public function buscarCep($params) {
        try {
            $cep   = (string)($params['cep'] ?? '');
            $dados = Enderecos::buscarCep($cep);

            if (!$dados) {
                http_response_code(404);
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'CEP não encontrado.'
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $dados
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Erro ao consultar CEP.',
                'detail'  => $e->getMessage()
            ]);
        }
    }
}
