<?php
header('Content-Type: application/json; charset=utf-8');

if(!extension_loaded('oci8')) {
    echo json_encode([
        'status' => 'error',
        'message' => 'A extensão OCI8 não está carregada no PHP!'
    ]);
    exit;
}

$username   = getenv('DB_USER');
$password   = getenv('DB_PASSWORD');
$db_service = getenv('DB_SERVICE');

$coon = @oci_connect($username, $password, $db_service, 'AL32UTF8');

if(!$coon) {
    $error = oci_error();
    echo json_encode([
        'status' => 'error',
        'message' => 'Falha ao conectar ao banco',
        'detalhes' => $error
    ], JSON_PRETTY_PRINT);
    exit;
}

$sql = "SELECT 
            SYSDATE AS DATA_ATUAL, USER AS USUARIO_CONECTADO
        FROM DUAL";

$stmt = oci_parse($coon, $sql);

oci_execute($stmt);

$resultado = oci_fetch_assoc($stmt);

oci_free_statement($stmt);
oci_close($coon);

echo json_encode([
    'status' => 'success',
    'message' => 'Conexão com o Oracle Cloud realizada com sucesso!',
    'dados' => $resultado
], JSON_PRETTY_PRINT);