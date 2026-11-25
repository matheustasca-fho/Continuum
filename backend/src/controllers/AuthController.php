<?php

require_once __DIR__ . '/../models/Auth.php';
require_once __DIR__ . '/../models/Doadores.php';
require_once __DIR__ . '/../models/Designers.php';
require_once __DIR__ . '/../models/Empresas.php';

class AuthController {

    /**
     * POST /api/auth/login
     * Busca o usuário no perfil informado e valida o hash da senha gravado no banco com password_verify().
     */
    public function login($data) {
        $perfil        = strtolower(trim((string)($data['perfil'] ?? 'doador')));
        $identificador = trim((string)($data['identificador'] ?? $data['login'] ?? ''));
        $senha         = (string)($data['senha'] ?? '');

        if ($identificador === '' || $senha === '') {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Identificador e senha são obrigatórios.',
                'message' => 'Identificador e senha são obrigatórios.'
            ]);
            return;
        }

        try {
            if ($perfil === 'doador') {
                $row = Doadores::buscarPorCpfOuEmail($identificador);
                if (!$row || !password_verify($senha, $row['SENHA_DOADOR'] ?? '')) {
                    http_response_code(401);
                    echo json_encode(['status' => 'error', 'erro' => 'Credenciais inválidas.', 'message' => 'Credenciais inválidas.']);
                    return;
                }
                $usuario = Doadores::formatar($row);
                $sessao  = Auth::setSessao('doador', [
                    'perfil'  => 'doador',
                    'id'      => $usuario['cpf'],
                    'cpf'     => $usuario['cpf'],
                    'nome'    => $usuario['nome'],
                    'email'   => $usuario['email'],
                    'usuario' => $usuario,
                ]);
            } elseif ($perfil === 'designer') {
                $row = Designers::buscarPorDocumentoOuEmail($identificador);
                if (!$row || !password_verify($senha, $row['SENHA_CONFECCIONISTA'] ?? '')) {
                    http_response_code(401);
                    echo json_encode(['status' => 'error', 'erro' => 'Credenciais inválidas.', 'message' => 'Credenciais inválidas.']);
                    return;
                }
                $usuario = Designers::formatar($row, false);
                $sessao  = Auth::setSessao('designer', [
                    'perfil'  => 'designer',
                    'id'      => $usuario['documento'],
                    'cpfCnpj' => $usuario['documento'],
                    'nome'    => $usuario['nome'],
                    'email'   => $usuario['email'],
                    'usuario' => $usuario,
                ]);
            } elseif ($perfil === 'empresa') {
                $row = Empresas::buscarUsuarioLogin($identificador);
                if (!$row || !password_verify($senha, $row['SENHA_HASH'] ?? '')) {
                    http_response_code(401);
                    echo json_encode(['status' => 'error', 'erro' => 'Credenciais inválidas.', 'message' => 'Credenciais inválidas.']);
                    return;
                }
                if ((int)($row['ST_ATIVO'] ?? 1) !== 1) {
                    http_response_code(403);
                    echo json_encode([
                        'status'  => 'error',
                        'erro'    => 'Usuário inativo. Contate o administrador da empresa.',
                        'message' => 'Usuário inativo. Contate o administrador da empresa.'
                    ]);
                    return;
                }
                $cnpj = trim($row['CNPJ_EMPRESA']);
                $emp  = Empresas::obterPorId($cnpj);
                if (!$emp || ($emp['assinatura']['status'] ?? '') !== 'ATIVA') {
                    http_response_code(403);
                    echo json_encode([
                        'status'  => 'error',
                        'erro'    => 'Assinatura aguardando pagamento.',
                        'message' => 'Assinatura aguardando pagamento.'
                    ]);
                    return;
                }
                $uFmt   = Empresas::formatarUsuario($row);
                $sessao = Auth::setSessao('empresa', [
                    'perfil'         => 'empresa',
                    'id'             => $emp['id'],
                    'empresaId'      => $emp['id'],
                    'perfilEmpresa'  => $uFmt['perfil'],
                    'usuarioEmpresa' => $uFmt,
                    'usuario'        => $uFmt,
                ]);
            } else {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'erro' => 'Perfil inválido.', 'message' => 'Perfil inválido.']);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => $sessao
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao processar login.',
                'message' => 'Erro ao processar login.',
                'detail'  => $e->getMessage()
            ]);
        }
    }

    /**
     * DELETE/POST /api/auth/logout
     */
    public function logout($data = []) {
        Auth::invalidarSessao();
        http_response_code(200);
        echo json_encode([
            'status'  => 'success',
            'message' => 'Sessão encerrada com sucesso.',
            'data'    => ['loggedOut' => true]
        ]);
    }

    /**
     * PATCH /api/auth/senha
     */
    public function redefinirSenha($data) {
        $identificador = trim((string)($data['identificador'] ?? ''));
        $novaSenha     = (string)($data['novaSenha'] ?? '');
        $confirmacao   = (string)($data['confirmacaoSenha'] ?? '');

        if (mb_strlen($novaSenha) < 8) {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'A senha deve ter pelo menos 8 caracteres.',
                'message' => 'A senha deve ter pelo menos 8 caracteres.'
            ]);
            return;
        }

        if ($novaSenha !== $confirmacao) {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'As senhas não coincidem.',
                'message' => 'As senhas não coincidem.'
            ]);
            return;
        }

        try {
            $conn = Database::getConnection();
            $hash = password_hash($novaSenha, PASSWORD_BCRYPT);

            if ($doador = Doadores::buscarPorCpfOuEmail($identificador)) {
                $cpf = trim($doador['CPF']);
                $stmt = oci_parse($conn, "UPDATE DOADOR SET SENHA_DOADOR = :h WHERE TRIM(CPF) = :cpf");
                oci_bind_by_name($stmt, ':h', $hash);
                oci_bind_by_name($stmt, ':cpf', $cpf);
                @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
                oci_free_statement($stmt);
            } elseif ($designer = Designers::buscarPorDocumentoOuEmail($identificador)) {
                $doc = Auth::onlyDigits($designer['CPF_CNPJ']);
                $stmt = oci_parse($conn, "UPDATE CONFECCIONISTA SET SENHA_CONFECCIONISTA = :h WHERE TRIM(CPF_CNPJ) = :doc");
                oci_bind_by_name($stmt, ':h', $hash);
                oci_bind_by_name($stmt, ':doc', $doc);
                @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
                oci_free_statement($stmt);
            } elseif ($empUser = Empresas::buscarUsuarioLogin($identificador)) {
                $idU = (int)$empUser['ID_USUARIO'];
                $stmt = oci_parse($conn, "UPDATE USUARIO_EMPRESA SET SENHA_HASH = :h WHERE ID_USUARIO = :id");
                oci_bind_by_name($stmt, ':h', $hash);
                oci_bind_by_name($stmt, ':id', $idU);
                @oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
                oci_free_statement($stmt);
            } else {
                http_response_code(404);
                echo json_encode([
                    'status'  => 'error',
                    'erro'    => 'Não encontramos uma conta com esse identificador.',
                    'message' => 'Não encontramos uma conta com esse identificador.'
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data'   => true
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'erro'    => 'Erro ao redefinir senha.',
                'message' => 'Erro ao redefinir senha.',
                'detail'  => $e->getMessage()
            ]);
        }
    }
}
