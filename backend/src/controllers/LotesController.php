<?php

require_once __DIR__ . '/../models/Lotes.php';

class LotesController {

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
                'message' => 'Erro ao consultar lotes',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    public function criar($data) {
        if (
            empty($data['cdLote']) || 
            empty($data['statusLote']) || 
            empty($data['descricaoItens']) || 
            !isset($data['pesoLote'])
        ) {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Campos obrigatórios: cdLote, statusLote, descricaoItens, pesoLote'
            ]);
            return;
        }

        try {
            Lotes::criar(
                $data['cdLote'],
                $data['statusLote'],
                $data['descricaoItens'],
                $data['pesoLote']
            );

            http_response_code(201); // 201 Created
            echo json_encode([
                'status'  => 'success',
                'message' => 'Lote cadastrado com sucesso!'
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Falha ao cadastrar o lote',
                'detail'  => $e->getMessage()
            ]);
        }
    }
}