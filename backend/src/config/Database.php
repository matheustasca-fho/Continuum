<?php

class Database {
    private static $connection = null;

    public static function getConnection() {
        if (self::$connection === null){
            $user      = getenv('DB_USER');
            $password  = getenv('DB_PASSWORD');
            $service   = getenv('DB_SERVICE');

            $coon = @oci_connect($user, $password, $service, 'AL32UTF8');

            if(!$coon) {
                $error = oci_error();
                http_response_code(500);
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Erro interno ao se conectar ao banco de dados',
                    'detail'  => $error['message'] ?? ''
                ]);
                exit;
            }

            self::$connection = $coon;
        }

        return self::$connection;
    }
}