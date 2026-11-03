<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/db.php';

$dadosRecebidos = json_decode(file_get_contents('php://input'), true);

$perfil = trim($dadosRecebidos['perfil'] ?? 'doador');
$login  = trim($dadosRecebidos['login'] ?? $dadosRecebidos['usuario'] ?? $dadosRecebidos['cpfCnpj'] ?? $dadosRecebidos['idAcesso'] ?? '');
$senha  = trim($dadosRecebidos['senha'] ?? '');

if ($login === '' || $senha === '') {
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Por favor, informe o usuário e a senha.'
    ]);
    exit;
}

$loginApenasNumeros = preg_replace('/\D/', '', $login);

$usuarioEncontrado = null;
$senhaDoBanco = '';
$nomeParaExibir = '';

if ($perfil === 'doador') {
    $sql = "SELECT CPF, NM_DOADOR, SENHA_DOADOR FROM Doador WHERE CPF = :cpf OR EMAIL_DOADOR = :email";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':cpf' => $loginApenasNumeros ?: $login,
        ':email' => $login
    ]);
    $usuarioEncontrado = $stmt->fetch();

    if ($usuarioEncontrado) {
        $senhaDoBanco = $usuarioEncontrado['SENHA_DOADOR'];
        $nomeParaExibir = $usuarioEncontrado['NM_DOADOR'];
    }

} elseif ($perfil === 'designer') {
    $sql = "SELECT ID_CONFECCIONISTA, NM_CONFECCIONISTA, NR_DOCUMENTO, SENHA_CONFECCIONISTA FROM CONFECCIONISTA WHERE NR_DOCUMENTO = :doc OR EMAIL_CONFECCIONISTA = :email";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':doc' => $loginApenasNumeros ?: $login,
        ':email' => $login
    ]);
    $usuarioEncontrado = $stmt->fetch();

    if ($usuarioEncontrado) {
        $senhaDoBanco = $usuarioEncontrado['SENHA_CONFECCIONISTA'];
        $nomeParaExibir = $usuarioEncontrado['NM_CONFECCIONISTA'];
    }

} elseif ($perfil === 'empresa') {
    $sql = "SELECT CNPJ, NM_FANTASIA, RAZÃO_SOCIAL, SENHA_EMPRESA FROM Empresa WHERE CNPJ = :cnpj OR EMAIL_EMPRESA = :email OR ID_EMPRESA = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':cnpj' => $loginApenasNumeros ?: $login,
        ':email' => $login,
        ':id' => is_numeric($login) ? (int)$login : -1
    ]);
    $usuarioEncontrado = $stmt->fetch();

    if ($usuarioEncontrado) {
        $senhaDoBanco = $usuarioEncontrado['SENHA_EMPRESA'];
        $nomeParaExibir = $usuarioEncontrado['NM_FANTASIA'] ?: $usuarioEncontrado['RAZÃO_SOCIAL'];
    }
}

if (!$usuarioEncontrado || $senha !== $senhaDoBanco) {
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Usuário ou senha inválidos.'
    ]);
    exit;
}

echo json_encode([
    'sucesso' => true,
    'mensagem' => 'Acesso liberado!',
    'dados' => [
        'login' => $login,
        'perfil' => $perfil,
        'nome' => $nomeParaExibir
    ]
]);
