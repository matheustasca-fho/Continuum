<?php

class Router {
    private $routes = [];

    public function add($method, $path, $handler) {
        $cleanPath = strtok($path, '?');
        $this->routes[] = [
            'method'  => strtoupper($method),
            'path'    => rtrim($cleanPath, '/') ?: '/',
            'handler' => $handler
        ];
    }

    private function normalizeUri($uri) {
        $clean = rtrim($uri, '/') ?: '/';
        return $clean;
    }

    private function compileRegex($routePath) {
        $pattern = preg_replace_callback(
            '/\{([a-zA-Z_][a-zA-Z0-9_]*)\}|:([a-zA-Z_][a-zA-Z0-9_]*)/',
            function ($matches) {
                $name = !empty($matches[1]) ? $matches[1] : $matches[2];
                return '(?P<' . $name . '>[^/]+)';
            },
            $routePath
        );
        return '#^' . $pattern . '$#';
    }

    private function isStaticRoute($routePath) {
        return strpos($routePath, '{') === false && strpos($routePath, ':') === false;
    }

    public function run() {
        $requestMethod = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $rawUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $uri = $this->normalizeUri($rawUri);

        // Permite casar tanto com prefixo /api quanto sem prefixo caso o cliente configure a URL base diferente
        $candidateUris = [$uri];
        if (strpos($uri, '/api/') !== 0 && $uri !== '/api') {
            $candidateUris[] = '/api' . ($uri === '/' ? '' : $uri);
        }

        $queryParams = $_GET ?? [];
        $bodyParams  = [];

        if (in_array($requestMethod, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $raw = file_get_contents('php://input');
            if ($raw !== false && trim($raw) !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $bodyParams = $decoded;
                }
            }
        }

        // 1ª passagem: rotas estáticas exatas têm precedência sobre parâmetros dinâmicos
        foreach ($this->routes as $route) {
            if ($route['method'] !== $requestMethod || !$this->isStaticRoute($route['path'])) {
                continue;
            }
            if (in_array($route['path'], $candidateUris, true)) {
                $params = array_merge($queryParams, $bodyParams);
                call_user_func($route['handler'], $params);
                return;
            }
        }

        // 2ª passagem: rotas parametrizadas ({id}, :id, etc.)
        foreach ($this->routes as $route) {
            if ($route['method'] !== $requestMethod || $this->isStaticRoute($route['path'])) {
                continue;
            }
            $regex = $this->compileRegex($route['path']);
            foreach ($candidateUris as $candidate) {
                if (preg_match($regex, $candidate, $matches)) {
                    $pathParams = [];
                    foreach ($matches as $key => $value) {
                        if (is_string($key)) {
                            $pathParams[$key] = rawurldecode($value);
                        }
                    }
                    $params = array_merge($queryParams, $bodyParams, $pathParams);
                    call_user_func($route['handler'], $params);
                    return;
                }
            }
        }

        http_response_code(404);
        echo json_encode([
            'status'  => 'error',
            'erro'    => 'Rota não encontrada',
            'message' => 'Rota não encontrada'
        ]);
    }
}