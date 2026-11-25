<?php

class Database {
    private static $connection = null;

    public static function getConnection() {
        if (self::$connection === null) {
            $user     = getenv('DB_USER');
            $password = getenv('DB_PASSWORD');
            $service  = getenv('DB_SERVICE');
            $schema   = getenv('DB_SCHEMA');

            $conn = @oci_connect($user, $password, $service, 'AL32UTF8');

            if (!$conn) {
                $error = oci_error();
                http_response_code(500);
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Erro interno ao se conectar ao banco de dados',
                    'detail'  => $error['message'] ?? ''
                ]);
                exit;
            }

            if ($schema && preg_match('/^[A-Za-z0-9_$#]+$/', trim($schema))) {
                $alter = @oci_parse($conn, 'ALTER SESSION SET CURRENT_SCHEMA = ' . strtoupper(trim($schema)));
                if ($alter) {
                    @oci_execute($alter);
                    @oci_free_statement($alter);
                }
            }

            self::$connection = $conn;
        }

        return self::$connection;
    }
}