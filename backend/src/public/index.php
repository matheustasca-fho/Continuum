<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../routes/Router.php';
require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/DoadoresController.php';
require_once __DIR__ . '/../controllers/DesignersController.php';
require_once __DIR__ . '/../controllers/EmpresasController.php';
require_once __DIR__ . '/../controllers/LotesController.php';
require_once __DIR__ . '/../controllers/ProjetosController.php';
require_once __DIR__ . '/../controllers/EnderecosController.php';
require_once __DIR__ . '/../controllers/SchemaController.php';
require_once __DIR__ . '/../models/Notificacoes.php';

$router              = new Router();
$authController      = new AuthController();
$doadoresController  = new DoadoresController();
$designersController = new DesignersController();
$empresasController  = new EmpresasController();
$lotesController     = new LotesController();
$projetosController  = new ProjetosController();
$enderecosController = new EnderecosController();
$schemaController    = new SchemaController();

// Autenticação e Sessão
$router->add('POST',   '/api/auth/login',    [$authController, 'login']);
$router->add('POST',   '/api/sessoes',       [$authController, 'login']);
$router->add('POST',   '/api/auth/logout',   [$authController, 'logout']);
$router->add('DELETE', '/api/auth/logout',   [$authController, 'logout']);
$router->add('DELETE', '/api/sessoes/atual', [$authController, 'logout']);
$router->add('PATCH',  '/api/auth/senha',    [$authController, 'redefinirSenha']);

// Doadores e Cupons
$router->add('POST',  '/api/doadores',                        [$doadoresController, 'registrar']);
$router->add('GET',   '/api/doadores',                        [$doadoresController, 'buscar']);
$router->add('GET',   '/api/doadores/me',                     [$doadoresController, 'meuPerfil']);
$router->add('GET',   '/api/doadores/me/estatisticas',        [$doadoresController, 'minhasEstatisticas']);
$router->add('GET',   '/api/doadores/{cpf}',                  [$doadoresController, 'obterPorCpf']);
$router->add('PATCH', '/api/doadores/{cpf}',                  [$doadoresController, 'atualizarPerfil']);
$router->add('GET',   '/api/cupons/{codigo}',                 [$doadoresController, 'validarCupom']);
$router->add('POST',  '/api/cupons/{codigo}/utilizacao',      [$doadoresController, 'utilizarCupom']);
$router->add('PATCH', '/api/cupons/{codigo}/utilizar',        [$doadoresController, 'utilizarCupom']);
$router->add('POST',  '/api/jobs/limpar-cpfs-nao-vinculados', [$doadoresController, 'limparCpfsNaoVinculados']);

// Designers / Confeccionistas
$router->add('POST',  '/api/designers',                       [$designersController, 'registrar']);
$router->add('GET',   '/api/designers/me',                    [$designersController, 'meuPerfil']);
$router->add('PUT',   '/api/designers/me/favoritos/{loteId}', [$designersController, 'alternarFavorito']);
$router->add('PATCH', '/api/designers/{id}',                  [$designersController, 'atualizarPerfil']);
$router->add('GET',   '/api/designers/{id}/lotes',            [$designersController, 'listarMeusLotes']);
$router->add('GET',   '/api/designers/{id}/projetos',         [$designersController, 'listarMeusProjetos']);
$router->add('GET',   '/api/designers/{id}/dashboard',        [$designersController, 'dashboard']);

// Empresas e Usuários de Empresa
$router->add('POST',  '/api/empresas/rascunhos',               [$empresasController, 'guardarRascunho']);
$router->add('POST',  '/api/empresas',                         [$empresasController, 'registrarComAssinatura']);
$router->add('GET',   '/api/empresas',                         [$empresasController, 'listar']);
$router->add('GET',   '/api/empresas/me',                      [$empresasController, 'minhaEmpresa']);
$router->add('GET',   '/api/empresas/me/dashboard',            [$empresasController, 'dashboard']);
$router->add('GET',   '/api/empresas/me/certificado',          [$empresasController, 'certificado']);
$router->add('GET',   '/api/empresas/me/usuarios',             [$empresasController, 'listarUsuarios']);
$router->add('POST',  '/api/empresas/me/usuarios',             [$empresasController, 'salvarUsuario']);
$router->add('PATCH', '/api/empresas/me/usuarios/{id}/status', [$empresasController, 'alternarStatusUsuario']);
$router->add('PATCH', '/api/empresas/me/usuarios/{id}',        [$empresasController, 'atualizarUsuario']);
$router->add('POST',  '/api/empresas/sessao/validar-admin',    [$empresasController, 'validarSenhaAdmin']);
$router->add('GET',   '/api/empresas/me/doacoes',              [$empresasController, 'listarDoacoes']);
$router->add('POST',  '/api/empresas/me/doacoes',              [$empresasController, 'registrarDoacao']);
$router->add('GET',   '/api/empresas/projetos',                [$empresasController, 'listarProjetos']);
$router->add('GET',   '/api/empresas/consulta-cnpj/{cnpj}',    [$empresasController, 'consultarCnpj']);
$router->add('PATCH', '/api/empresas/{id}',                    [$empresasController, 'atualizarPerfil']);
$router->add('GET',   '/api/empresas/{id}/lotes',              [$empresasController, 'listarLotes']);

// Lotes e Jobs de Reserva
$router->add('GET',    '/api/lotes',                   [$lotesController, 'listar']);
$router->add('POST',   '/api/lotes',                   [$lotesController, 'criar']);
$router->add('GET',    '/api/lotes/vitrine',           [$lotesController, 'listarVitrine']);
$router->add('GET',    '/api/lotes/{codigo}',          [$lotesController, 'obterPorCodigo']);
$router->add('PATCH',  '/api/lotes/{id}',              [$lotesController, 'atualizar']);
$router->add('DELETE', '/api/lotes/{id}',              [$lotesController, 'excluir']);
$router->add('POST',   '/api/lotes/{codigo}/reservas', [$lotesController, 'reservar']);
$router->add('PATCH',  '/api/lotes/{id}/retirada',     [$lotesController, 'confirmarRetirada']);
$router->add('PATCH',  '/api/lotes/{id}/envio',        [$lotesController, 'registrarEnvio']);
$router->add('PATCH',  '/api/lotes/{id}/rastreio',     [$lotesController, 'registrarEnvio']);
$router->add('PATCH',  '/api/lotes/{id}/recebimento',  [$lotesController, 'confirmarRecebimento']);
$router->add('POST',   '/api/lotes/{id}/cancelamento', [$lotesController, 'cancelar']);
$router->add('POST',   '/api/jobs/expirar-reservas',   [$lotesController, 'expirarReservas']);

// Projetos e Rastreabilidade Pública (QR Code)
$router->add('GET',   '/api/projetos/{id}',                   [$projetosController, 'obter']);
$router->add('GET',   '/api/projetos/{id}/qrcode',            [$projetosController, 'qrcode']);
$router->add('PATCH', '/api/projetos/{id}/finalizacao',       [$projetosController, 'finalizar']);
$router->add('PATCH', '/api/projetos/{id}/status',            [$projetosController, 'alterarStatus']);
$router->add('PATCH', '/api/projetos/{id}/conclusao',         [$projetosController, 'alterarStatus']);
$router->add('GET',   '/api/publico/pecas/{codigo}',          [$projetosController, 'obter']);
$router->add('GET',   '/api/publico/pecas/{codigo}/qrcode',   [$projetosController, 'qrcode']);

// Notificações (BE-17)
$router->add('GET', '/api/notificacoes', function ($params) {
    $perfil = isset($params['perfil']) ? (string)$params['perfil'] : null;
    $destId = isset($params['destinatarioId']) ? (string)$params['destinatarioId'] : null;
    $tipo   = isset($params['tipo']) ? (string)$params['tipo'] : null;
    $lista  = Notificacoes::listar($perfil, $destId, $tipo);
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'total'  => count($lista),
        'data'   => $lista,
    ]);
});

$router->add('POST', '/api/notificacoes', function ($data) {
    $tipo   = (string)($data['tipo'] ?? 'AVISO');
    $perfil = (string)($data['destinatarioPerfil'] ?? 'empresa');
    $destId = (string)($data['destinatarioId'] ?? '12345678000190');
    $titulo = (string)($data['titulo'] ?? 'Notificação do sistema');
    $msg    = (string)($data['mensagem'] ?? '');
    $ref    = (string)($data['referenciaId'] ?? '');
    $notif  = Notificacoes::registrar($tipo, $perfil, $destId, $titulo, $msg, $ref);
    http_response_code(201);
    echo json_encode([
        'status' => 'success',
        'data'   => $notif,
    ]);
});

// Endereços
$router->add('GET', '/api/enderecos/cep/{cep}', [$enderecosController, 'buscarCep']);

// Introspecção do Schema (DDL)
$router->add('GET', '/api/schema',     [$schemaController, 'listar']);
$router->add('GET', '/api/schema/ddl', [$schemaController, 'ddl']);

$router->run();
