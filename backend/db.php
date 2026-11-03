<?php
if (file_exists(__DIR__ . '/.env')) {
    $linhas = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($linhas as $linha) {
        if (str_starts_with(trim($linha), '#') || !str_contains($linha, '=')) continue;
        [$chave, $valor] = explode('=', $linha, 2);
        putenv(trim($chave) . '=' . trim($valor));
    }
}

$host     = getenv('DB_HOST') ?: '127.0.0.1';
$porta    = getenv('DB_PORT') ?: '3306';
$banco    = getenv('DB_NAME') ?: 'continuum';
$usuario  = getenv('DB_USER') ?: 'root';
$senha    = getenv('DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("mysql:host=$host;port=$porta;dbname=$banco;charset=utf8mb4", $usuario, $senha, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $erro) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível conectar ao banco de dados: ' . $erro->getMessage()
    ]);
    exit;
}
