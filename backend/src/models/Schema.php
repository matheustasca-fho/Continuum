<?php

require_once __DIR__ . '/../config/Database.php';

/**
 * Introspecção do schema Oracle (dicionário de dados ALL_*).
 * O schema inspecionado vem de DB_SCHEMA (.env); se ausente, usa o usuário conectado.
 * Gera a descrição estruturada das tabelas e o DDL correspondente.
 */
class Schema {

    private static $owner = null;

    public static function owner() {
        if (self::$owner === null) {
            $env = getenv('DB_SCHEMA');
            if ($env) {
                self::$owner = strtoupper(trim($env));
            } else {
                $rows = self::query("SELECT USER AS OWNER FROM DUAL");
                self::$owner = $rows[0]['OWNER'];
            }
        }
        return self::$owner;
    }

    /* ------------------------------------------------------------------ */
    /* Helpers de consulta                                                 */
    /* ------------------------------------------------------------------ */

    private static function query($sql, array $binds = []) {
        $conn = Database::getConnection();
        $stmt = oci_parse($conn, $sql);

        foreach ($binds as $name => $value) {
            $binds[$name] = $value; // mantém referência estável para o bind
            oci_bind_by_name($stmt, $name, $binds[$name]);
        }

        if (!@oci_execute($stmt)) {
            $error = oci_error($stmt);
            oci_free_statement($stmt);
            throw new Exception($error['message'] ?? 'Erro ao consultar o dicionário de dados');
        }

        $rows = [];
        while ($row = oci_fetch_assoc($stmt)) {
            $rows[] = $row;
        }

        oci_free_statement($stmt);
        return $rows;
    }

    /* ------------------------------------------------------------------ */
    /* Leitura do dicionário de dados                                      */
    /* ------------------------------------------------------------------ */

    public static function listarTabelas() {
        $rows = self::query(
            "SELECT TABLE_NAME
               FROM ALL_TABLES
              WHERE OWNER = :owner
                AND NESTED = 'NO'
                AND SECONDARY = 'N'
                AND DROPPED = 'NO'
                AND TABLE_NAME NOT LIKE 'BIN$%'
                AND TABLE_NAME NOT LIKE 'DBTOOLS$%' -- tabela interna do SQL Developer Web
              ORDER BY TABLE_NAME",
            [':owner' => self::owner()]
        );

        return array_column($rows, 'TABLE_NAME');
    }

    private static function colunas($tabela) {
        $rows = self::query(
            "SELECT c.COLUMN_ID, c.COLUMN_NAME, c.DATA_TYPE, c.DATA_LENGTH, c.CHAR_LENGTH,
                    c.CHAR_USED, c.DATA_PRECISION, c.DATA_SCALE, c.NULLABLE, c.DATA_DEFAULT,
                    i.GENERATION_TYPE
               FROM ALL_TAB_COLUMNS c
               LEFT JOIN ALL_TAB_IDENTITY_COLS i
                      ON i.OWNER = c.OWNER
                     AND i.TABLE_NAME = c.TABLE_NAME
                     AND i.COLUMN_NAME = c.COLUMN_NAME
              WHERE c.OWNER = :owner
                AND c.TABLE_NAME = :tabela
              ORDER BY c.COLUMN_ID",
            [':owner' => self::owner(), ':tabela' => $tabela]
        );

        $colunas = [];
        foreach ($rows as $r) {
            $identity = !empty($r['GENERATION_TYPE']);
            $default  = isset($r['DATA_DEFAULT']) ? trim($r['DATA_DEFAULT']) : null;

            $colunas[] = [
                'posicao'   => (int) $r['COLUMN_ID'],
                'nome'      => $r['COLUMN_NAME'],
                'tipo'      => self::formatarTipo($r),
                'nulo'      => $r['NULLABLE'] === 'Y',
                'default'   => ($identity || $default === '') ? null : $default,
                'identity'  => $identity ? $r['GENERATION_TYPE'] : null,
                'pk'        => false,
                'fk'        => null,
            ];
        }

        return $colunas;
    }

    private static function chavePrimaria($tabela) {
        $rows = self::query(
            "SELECT c.CONSTRAINT_NAME, cc.COLUMN_NAME
               FROM ALL_CONSTRAINTS c
               JOIN ALL_CONS_COLUMNS cc ON cc.OWNER = c.OWNER AND cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
              WHERE c.OWNER = :owner
                AND c.TABLE_NAME = :tabela
                AND c.CONSTRAINT_TYPE = 'P'
              ORDER BY cc.POSITION",
            [':owner' => self::owner(), ':tabela' => $tabela]
        );

        if (!$rows) {
            return null;
        }

        return [
            'nome'    => $rows[0]['CONSTRAINT_NAME'],
            'colunas' => array_column($rows, 'COLUMN_NAME'),
        ];
    }

    private static function chavesUnicas($tabela) {
        $rows = self::query(
            "SELECT c.CONSTRAINT_NAME, cc.COLUMN_NAME
               FROM ALL_CONSTRAINTS c
               JOIN ALL_CONS_COLUMNS cc ON cc.OWNER = c.OWNER AND cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
              WHERE c.OWNER = :owner
                AND c.TABLE_NAME = :tabela
                AND c.CONSTRAINT_TYPE = 'U'
              ORDER BY c.CONSTRAINT_NAME, cc.POSITION",
            [':owner' => self::owner(), ':tabela' => $tabela]
        );

        $uks = [];
        foreach ($rows as $r) {
            $uks[$r['CONSTRAINT_NAME']]['nome']      = $r['CONSTRAINT_NAME'];
            $uks[$r['CONSTRAINT_NAME']]['colunas'][] = $r['COLUMN_NAME'];
        }

        return array_values($uks);
    }

    private static function chavesEstrangeiras($tabela) {
        $rows = self::query(
            "SELECT c.CONSTRAINT_NAME, c.DELETE_RULE, cc.COLUMN_NAME,
                    rc.TABLE_NAME  AS REF_TABLE,
                    rcc.COLUMN_NAME AS REF_COLUMN
               FROM ALL_CONSTRAINTS c
               JOIN ALL_CONS_COLUMNS cc
                    ON cc.OWNER = c.OWNER AND cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
               JOIN ALL_CONSTRAINTS rc
                    ON rc.OWNER = c.R_OWNER AND rc.CONSTRAINT_NAME = c.R_CONSTRAINT_NAME
               JOIN ALL_CONS_COLUMNS rcc
                    ON rcc.OWNER = rc.OWNER AND rcc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
                   AND rcc.POSITION = cc.POSITION
              WHERE c.OWNER = :owner
                AND c.TABLE_NAME = :tabela
                AND c.CONSTRAINT_TYPE = 'R'
              ORDER BY c.CONSTRAINT_NAME, cc.POSITION",
            [':owner' => self::owner(), ':tabela' => $tabela]
        );

        $fks = [];
        foreach ($rows as $r) {
            $nome = $r['CONSTRAINT_NAME'];
            if (!isset($fks[$nome])) {
                $fks[$nome] = [
                    'nome'               => $nome,
                    'colunas'            => [],
                    'tabela_referenciada'=> $r['REF_TABLE'],
                    'colunas_referenciadas' => [],
                    'on_delete'          => $r['DELETE_RULE'],
                ];
            }
            $fks[$nome]['colunas'][]               = $r['COLUMN_NAME'];
            $fks[$nome]['colunas_referenciadas'][] = $r['REF_COLUMN'];
        }

        return array_values($fks);
    }

    /**
     * DESCRIBE completo de uma tabela: campos, tipos, PK, FKs e UKs.
     */
    public static function descreverTabela($tabela) {
        $colunas = self::colunas($tabela);
        $pk      = self::chavePrimaria($tabela);
        $fks     = self::chavesEstrangeiras($tabela);
        $uks     = self::chavesUnicas($tabela);

        foreach ($colunas as &$col) {
            if ($pk && in_array($col['nome'], $pk['colunas'], true)) {
                $col['pk'] = true;
            }
            foreach ($fks as $fk) {
                $idx = array_search($col['nome'], $fk['colunas'], true);
                if ($idx !== false) {
                    $col['fk'] = $fk['tabela_referenciada'] . '.' . $fk['colunas_referenciadas'][$idx];
                }
            }
        }
        unset($col);

        return [
            'tabela'              => $tabela,
            'colunas'             => $colunas,
            'chave_primaria'      => $pk,
            'chaves_estrangeiras' => $fks,
            'chaves_unicas'       => $uks,
        ];
    }

    public static function descreverTodas() {
        $resultado = [];
        foreach (self::listarTabelas() as $tabela) {
            $resultado[] = self::descreverTabela($tabela);
        }
        return $resultado;
    }

    /* ------------------------------------------------------------------ */
    /* Geração de DDL                                                      */
    /* ------------------------------------------------------------------ */

    private static function formatarTipo(array $r) {
        $tipo      = $r['DATA_TYPE'];
        $precision = $r['DATA_PRECISION'];
        $scale     = $r['DATA_SCALE'];

        switch ($tipo) {
            case 'VARCHAR2':
            case 'CHAR':
                return sprintf('%s(%d%s)', $tipo, $r['CHAR_LENGTH'], $r['CHAR_USED'] === 'C' ? ' CHAR' : '');
            case 'NVARCHAR2':
            case 'NCHAR':
                return sprintf('%s(%d)', $tipo, $r['CHAR_LENGTH']);
            case 'RAW':
                return sprintf('RAW(%d)', $r['DATA_LENGTH']);
            case 'NUMBER':
                if ($precision === null && $scale === null) return 'NUMBER';
                if ($precision === null)                    return 'NUMBER(*,' . $scale . ')';
                if ((int) $scale === 0)                     return 'NUMBER(' . $precision . ')';
                return 'NUMBER(' . $precision . ',' . $scale . ')';
            case 'FLOAT':
                return $precision !== null ? 'FLOAT(' . $precision . ')' : 'FLOAT';
            default:
                // DATE, CLOB, BLOB, TIMESTAMP(n), etc. já vêm completos em DATA_TYPE
                return $tipo;
        }
    }

    private static function cols(array $cols) {
        return implode(', ', array_map(fn($c) => '"' . $c . '"', $cols));
    }

    public static function gerarDDL(array $tabelas = null) {
        $tabelas = $tabelas ?? self::descreverTodas();

        $linhas   = [];
        $linhas[] = '-- ============================================================';
        $linhas[] = '-- CONTINUUM — Schema do banco de dados (Oracle)';
        $linhas[] = '-- Gerado automaticamente em ' . date('Y-m-d H:i:s');
        $linhas[] = '-- Schema (owner): ' . self::owner();
        $linhas[] = '-- Tabelas: ' . count($tabelas);
        $linhas[] = '-- ============================================================';
        $linhas[] = '';

        $fksDDL = [];

        foreach ($tabelas as $t) {
            $defs = [];

            foreach ($t['colunas'] as $c) {
                $def = sprintf('    "%s" %s', $c['nome'], $c['tipo']);
                if ($c['identity']) {
                    $def .= ' GENERATED ' . $c['identity'] . ' AS IDENTITY';
                } elseif ($c['default'] !== null) {
                    $def .= ' DEFAULT ' . $c['default'];
                }
                if (!$c['nulo']) {
                    $def .= ' NOT NULL';
                }
                $defs[] = $def;
            }

            if ($t['chave_primaria']) {
                $defs[] = sprintf('    CONSTRAINT "%s" PRIMARY KEY (%s)',
                    $t['chave_primaria']['nome'], self::cols($t['chave_primaria']['colunas']));
            }

            foreach ($t['chaves_unicas'] as $uk) {
                $defs[] = sprintf('    CONSTRAINT "%s" UNIQUE (%s)', $uk['nome'], self::cols($uk['colunas']));
            }

            $linhas[] = '-- ------------------------------------------------------------';
            $linhas[] = '-- Tabela: ' . $t['tabela'];
            $linhas[] = '-- ------------------------------------------------------------';
            $linhas[] = sprintf('CREATE TABLE "%s" (', $t['tabela']);
            $linhas[] = implode(",\n", $defs);
            $linhas[] = ');';
            $linhas[] = '';

            // FKs ao final para não depender da ordem de criação das tabelas
            foreach ($t['chaves_estrangeiras'] as $fk) {
                $sql = sprintf(
                    'ALTER TABLE "%s" ADD CONSTRAINT "%s" FOREIGN KEY (%s) REFERENCES "%s" (%s)',
                    $t['tabela'], $fk['nome'], self::cols($fk['colunas']),
                    $fk['tabela_referenciada'], self::cols($fk['colunas_referenciadas'])
                );
                if ($fk['on_delete'] && $fk['on_delete'] !== 'NO ACTION') {
                    $sql .= ' ON DELETE ' . $fk['on_delete'];
                }
                $fksDDL[] = $sql . ';';
            }
        }

        if ($fksDDL) {
            $linhas[] = '-- ============================================================';
            $linhas[] = '-- Chaves estrangeiras';
            $linhas[] = '-- ============================================================';
            array_push($linhas, ...$fksDDL);
            $linhas[] = '';
        }

        return implode("\n", $linhas);
    }
}
