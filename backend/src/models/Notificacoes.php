<?php

require_once __DIR__ . '/Auth.php';

class Notificacoes {

    public const TIPOS_OFICIAIS = [
        'RESERVA_CRIADA',
        'PRAZO_PROXIMO',
        'PRAZO_VENCIDO',
        'ENVIO_REGISTRADO',
        'RECEBIMENTO_CONFIRMADO',
        'PECA_ENVIADA_LOJA',
        'AJUSTE_SOLICITADO',
        'PROJETO_FINALIZADO',
        'CUPOM_GERADO',
        'CUPOM_EXPIRANDO',
    ];

    public static function registrar(
        string $tipo,
        string $destinatarioPerfil,
        string $destinatarioId,
        string $titulo,
        string $mensagem,
        string $referenciaId = ''
    ): array {
        $state = Auth::getState();
        if (!isset($state['notificacoes']) || !is_array($state['notificacoes'])) {
            $state['notificacoes'] = [];
        }

        $destIdNorm = trim($destinatarioId);
        $perfilNorm = strtolower(trim($destinatarioPerfil));
        $tipoNorm   = strtoupper(trim($tipo));
        $chaveUnica = $tipoNorm . ':' . $perfilNorm . ':' . $destIdNorm . ':' . trim($referenciaId);

        // Evita duplicidade para o mesmo evento/destinatário/referência (BE-17)
        foreach ($state['notificacoes'] as $existente) {
            if (($existente['chaveUnica'] ?? '') === $chaveUnica && $referenciaId !== '') {
                return $existente;
            }
        }

        $novoId = 'NOTIF-' . (count($state['notificacoes']) + 1) . '-' . substr(md5($chaveUnica . microtime(true)), 0, 6);
        $notif = [
            'id'                 => $novoId,
            'chaveUnica'         => $chaveUnica,
            'tipo'               => $tipoNorm,
            'destinatarioPerfil' => $perfilNorm,
            'destinatarioId'     => $destIdNorm,
            'titulo'             => $titulo,
            'mensagem'           => $mensagem,
            'referenciaId'       => $referenciaId,
            'lida'               => false,
            'criadoEm'           => date('c'),
        ];

        $state['notificacoes'][] = $notif;
        Auth::saveState($state);
        return $notif;
    }

    public static function listar(?string $perfil = null, ?string $destinatarioId = null, ?string $tipo = null): array {
        $state = Auth::getState();
        $todas = is_array($state['notificacoes'] ?? null) ? $state['notificacoes'] : [];

        $filtradas = [];
        foreach ($todas as $n) {
            if ($perfil !== null && $perfil !== '' && strcasecmp($n['destinatarioPerfil'] ?? '', $perfil) !== 0) {
                continue;
            }
            if ($destinatarioId !== null && $destinatarioId !== '') {
                $dAlvo = Auth::onlyDigits($destinatarioId) ?: trim($destinatarioId);
                $dNotif = Auth::onlyDigits($n['destinatarioId'] ?? '') ?: trim($n['destinatarioId'] ?? '');
                if (strcasecmp($dNotif, $dAlvo) !== 0) {
                    continue;
                }
            }
            if ($tipo !== null && $tipo !== '' && strcasecmp($n['tipo'] ?? '', $tipo) !== 0) {
                continue;
            }
            $filtradas[] = $n;
        }

        return array_values($filtradas);
    }
}
