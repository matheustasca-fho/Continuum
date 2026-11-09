<?php

class Router {
    private $routes = [];

    public function add($method, $path, $handler) {
        $this->routes[] = [
            'method'  => strtoupper($method),
            'path'    => $path,
            'handler' => $handler
        ];
    }

    public function run() {
        $requestMethod = $_SERVER['REQUEST_METHOD'];

        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    if (in_array($requestMethod, ['POST', 'PUT', 'PATCH'])) {
        $raw = file_get_contents('php://input');
        $params = json_decode($raw, true) ?? [];
    } else {
        $params = $_GET;
    }

        foreach ($this->routes as $route) {
            if ($route['method'] === $requestMethod && $route['path'] === $uri){
                call_user_func($route['handler'], $params);
                return;
            }
        }

        http_response_code(404);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Rota não encontrada'
        ]);
    }
}