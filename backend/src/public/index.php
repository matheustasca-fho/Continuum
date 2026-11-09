<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // Em produção, aponte para o domínio do frontend
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../routes/Router.php';
require_once __DIR__ . '/../controllers/LotesController.php';

$router = new Router();
$lotesController = new LotesController();

$router->add('GET', '/api/lotes', [$lotesController, 'listar']);

$router->add('POST', '/api/lotes', [$lotesController, 'criar']);

$router->run();