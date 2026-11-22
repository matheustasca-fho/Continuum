<?php

require_once __DIR__ . '/../models/Schema.php';

class SchemaController {

    /** Caminho do DDL gerado (fora da pasta public). */
    private const DDL_PATH = __DIR__ . '/../database/schema.sql';

    /**
     * GET /api/schema
     * Lista todas as tabelas com o "describe" de cada uma (campos, tipos, PK, FK, UK).
     * Filtro opcional: ?tabela=LOTES
     */
    public function listar($params) {
        try {
            if (!empty($params['tabela'])) {
                $tabela = strtoupper(trim($params['tabela']));
                if (!in_array($tabela, Schema::listarTabelas(), true)) {
                    http_response_code(404);
                    echo json_encode(['status' => 'error', 'message' => "Tabela '$tabela' não encontrada"]);
                    return;
                }
                $data = [Schema::descreverTabela($tabela)];
            } else {
                $data = Schema::descreverTodas();
            }

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'total'  => count($data),
                'data'   => $data,
            ], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Erro ao consultar o schema do banco',
                'detail'  => $e->getMessage(),
            ]);
        }
    }

    /**
     * GET /api/schema/ddl
     * Gera o DDL completo, salva em src/database/schema.sql e devolve o SQL.
     * ?download=1 força o download do arquivo.
     */
    public function ddl($params) {
        try {
            $ddl = Schema::gerarDDL();

            $dir = dirname(self::DDL_PATH);
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }
            $salvo = @file_put_contents(self::DDL_PATH, $ddl) !== false;

            header('Content-Type: application/sql; charset=utf-8');
            header('X-Schema-File-Saved: ' . ($salvo ? 'true' : 'false'));
            if (!empty($params['download'])) {
                header('Content-Disposition: attachment; filename="schema.sql"');
            }

            http_response_code(200);
            echo $ddl;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Erro ao gerar o DDL do banco',
                'detail'  => $e->getMessage(),
            ]);
        }
    }
}
