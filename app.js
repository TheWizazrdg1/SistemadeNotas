var express = require('express');
var app = express();
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);


// ==========================================
// 1. CONFIGURACIÓN DE MIDDLEWARES BASE
// ==========================================

app.set('view engine', 'ejs');

// CORS primero
app.use(cors({
  origin: 'http://localhost:3000', // Ajusta según tu puerto
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ==========================================
// 2. BASE DE DATOS Y SESIONES
// ==========================================

// Configuración de la Base de Datos (Pool)
const dbConfig = {
    host: "localhost",
    database: "libro_clases",
    user: "root",
    password: "",
    waitForConnections: true, // Esperar si no hay conexiones libres
    connectionLimit: 20,      // Máximo 10 conexiones simultáneas
    queueLimit: 0             // Sin límite de cola de espera
};

const pool = mysql.createPool(dbConfig); 
const oConexion = pool; // Mantenemos oConexion para compatibilidad con tu código

// Verificación inicial del Pool
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error al conectar con el Pool:', err.code);
    } else {
        console.log('✓ Pool de conexiones activo. ID del hilo:', connection.threadId);
        connection.release(); // IMPORTANTE: Devolver la conexión al pool
    }
});

// Configuración del Store para Sesiones
const sessionStore = new MySQLStore({
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, pool.promise());

// Inicialización de Sesiones
app.use(session({
    key: 'libro_clases_sid',
    secret: 'mi_secreto_super_seguro_2024',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }
}));


// ==========================================
// 3. MIDDLEWARES GLOBALES Y UTILIDADES
// ==========================================

// Middleware para debug (temporal)
app.use((req, res, next) => {
    console.log('📍 Ruta:', req.method, req.path);
    console.log('🔑 Sesión existe:', !!req.session);
    console.log('👤 Usuario en sesión:', req.session?.id_usuario || 'No autenticado');
    next();
});

// Archivos estáticos
app.use(express.static('public'));

// Función Helper para consultas asíncronas
function queryAsync(sql, params) {
    return new Promise((resolve, reject) => {
        oConexion.query(sql, params, (error, resultados) => {
            if (error) return reject(error);
            resolve(resultados);
        });
    });
}

// Middleware: Verificador de Sesión General
function verificarSesion(req, res, next) {
    console.log('🔍 Verificando sesión...');
    console.log('Session object:', req.session);
    
    if (!req.session || !req.session.id_usuario) {
        console.log('❌ No hay sesión activa, redirigiendo a /inicio');
        return res.redirect('/inicio');
    }
    
    console.log('✅ Sesión válida para usuario:', req.session.nombre);
    next();
}

// Middleware: Verificador de Admin
function soloAdmin(req, res, next) {
    if (!req.session || !req.session.id_usuario) {
        console.log('❌ Sin sesión, redirigiendo a /inicio');
        return res.redirect('/inicio');
    }
    if (req.session.rol !== 'admin') {
        console.log('❌ Usuario no es admin');
        return res.status(403).send('Acceso denegado. Se requieren permisos de administrador.');
    }
    next();
}


// ==========================================
// 4. RUTAS PÚBLICAS Y AUTENTICACIÓN
// ==========================================

app.get('/', (req, res) => {
    res.redirect('/inicio');
});

app.get('/inicio', (req, res) => {
    // Si ya tiene sesión activa
    if (req.session && req.session.id_usuario) {
        console.log('Usuario ya autenticado, redirigiendo...');
        if (req.session.rol === 'admin') {
            return res.redirect('/contenedor_admin');
        } else {
            return res.redirect('/notas');
        }
    }
    res.render('inicio_sesion', { error: null });
});

app.post('/login', (req, res) => {
    console.log('🔐 Intento de login...');
    console.log('Body recibido:', req.body);
    
    const { Usuario, password } = req.body;

    if (!Usuario || !password) {
        console.log('❌ Campos vacíos');
        return res.render('inicio_sesion', { error: 'Debe ingresar usuario y contraseña' });
    }

    const sql = `
        SELECT id_usuario, username, rol 
        FROM usuarios 
        WHERE username = ? 
        AND password = SHA2(?, 256)
    `;

    oConexion.query(sql, [Usuario, password], (error, results) => {
        if (error) {
            console.error('❌ Error en consulta:', error);
            return res.status(500).render('inicio_sesion', { error: 'Error del servidor' });
        }

        console.log('Resultados de BD:', results);

        if (results.length > 0) {
            const user = results[0];
            req.session.regenerate((err) => {
                if (err) {
                    console.error('Error al regenerar sesión:', err);
                    return res.status(500).send('Error al iniciar sesión');
                }
                req.session.id_usuario = user.id_usuario;
                req.session.rol = user.rol;
                req.session.nombre = user.username;

                req.session.save((err) => {
                    if (err) {
                        console.error('Error al guardar sesión:', err);
                        return res.status(500).send('Error al guardar sesión');
                    }
                    console.log('✅ Sesión guardada correctamente');
                    console.log('Usuario:', user.username, '| Rol:', user.rol);

                    if (user.rol === 'admin') {
                        return res.redirect('/contenedor_admin');
                    } else {
                        return res.redirect('/notas');
                    }
                });
            });
        } else {
            console.log('❌ Credenciales incorrectas para:', Usuario);
            return res.render('inicio_sesion', { error: 'Usuario o contraseña incorrectos' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.clearCookie('libro_clases_sid');
        res.redirect('/inicio');
    });
});


// ==========================================
// 5. VISTAS PRINCIPALES (PANELES)
// ==========================================

app.get('/contenedor_admin', soloAdmin, (req, res) => {
    res.render('contenedor_admin', { nombre: req.session.nombre });
});

app.get('/notas', verificarSesion, (req, res) => {
    console.log('📄 Renderizando página de notas para:', req.session.nombre);
    res.render('contenedor_notas', { nombre: req.session.nombre, rol: req.session.rol });
});

app.get('/anotaciones', verificarSesion, (req, res) => {
    res.render('contenedor_anotaciones', { nombre: req.session.nombre });
});


// ==========================================
// 6. MÓDULO: ALUMNOS
// ==========================================

app.get('/alumnos', verificarSesion, async (req, res) => {
    const sqlAlumnos = `
        SELECT a.*, c.nombre_curso, c.grado 
        FROM alumnos a
        LEFT JOIN cursos c ON a.curso_id = c.id_curso
        WHERE a.estado = 1
    `;
    const rows = await queryAsync(sqlAlumnos);
    const cursos = await queryAsync("SELECT * FROM cursos");

    res.render('contenedor_alumnos', { nombre: req.session.nombre, alumnos: rows, cursos: cursos });
});

app.get('/api/alumnos', verificarSesion, async (req, res) => {
    try {
        const sql = `
           SELECT a.id_alumno, a.nombres, a.apellido_paterno, a.apellido_materno, a.rut, c.grado, c.nombre_curso
            FROM alumnos a
            LEFT JOIN cursos c ON a.curso_id = c.id_curso
            ORDER BY a.apellido_paterno, a.nombres
        `;
        const resultados = await queryAsync(sql);
        res.json(resultados);
    } catch (error) {
        console.error('Error al obtener alumnos:', error);
        res.status(500).json({ error: 'Error al obtener alumnos' });
    }
});

app.get('/api/alumnos_curso/:id_curso', verificarSesion, async (req, res) => {
    try {
        const { id_curso } = req.params;
        const sql = `
            SELECT id_alumno, rut, nombres, apellido_paterno, apellido_materno 
            FROM alumnos 
            WHERE curso_id = ? AND estado = 1 
            ORDER BY apellido_paterno ASC, apellido_materno ASC, nombres ASC
        `;
        const alumnos = await queryAsync(sql, [id_curso]);
        res.json(alumnos);
    } catch (error) {
        console.error('Error al obtener alumnos del curso:', error);
        res.status(500).json({ error: 'Error al obtener alumnos' });
    }
});

app.post('/crear_alumno', verificarSesion, async (req, res) => {
    try {
        const { rut, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, curso_id } = req.body;
        if (!rut || !nombres || !apellido_paterno || !fecha_nacimiento || !curso_id) {
            return res.send('Faltan datos por completar');
        }
        const sql = 'INSERT INTO alumnos (rut, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, curso_id) VALUES (?, ?, ?, ?, ?, ?)';
        await queryAsync(sql, [rut, nombres, apellido_paterno, apellido_materno || null, fecha_nacimiento, curso_id]);
        res.redirect('/alumnos'); 
    } catch (error) {
        console.error('Error al crear alumno:', error);
        res.status(500).send('Error al crear el alumno');
    }
});

app.post('/editar_alumno', verificarSesion, async (req, res) => {
    try {
        const { id_alumno, rut, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, curso_id } = req.body;

        const sql = `
            UPDATE alumnos 
            SET rut = ?, nombres = ?, apellido_paterno = ?, apellido_materno = ?, fecha_nacimiento = ?, curso_id = ? 
            WHERE id_alumno = ?
        `;

        await queryAsync(sql, [rut, nombres, apellido_paterno, apellido_materno || null, fecha_nacimiento, curso_id, id_alumno]);
        res.redirect('/alumnos'); 
    } catch (error) {
        console.error('Error al editar alumno:', error);
        res.status(500).send('Error al actualizar alumno');
    }
});

app.get('/borrar_alumno/:id', verificarSesion, async (req, res) => {
    const { id } = req.params;
    try {
        await queryAsync('UPDATE alumnos SET estado = 0 WHERE id_alumno = ?', [id]);
        console.log(`Alumno ID ${id} desactivado (enviado a papelera).`);
        res.redirect('/alumnos');
    } catch (error) {
        console.error(error);
        res.redirect('/alumnos'); 
    }
});


// ==========================================
// 7. MÓDULO: CURSOS
// ==========================================

app.get('/cursos', verificarSesion, async (req, res) => {
    try {
        const sqlCursos = `
            SELECT c.*, d.nombre AS nombre_profesor, d.apellido AS apellido_profesor 
            FROM cursos c
            LEFT JOIN docentes d ON c.id_docente = d.id_docente
            WHERE c.estado = 1 
            ORDER BY c.grado ASC, c.nombre_curso ASC
        `;
        const cursos = await queryAsync(sqlCursos);
        const sqlDocentes = `SELECT id_docente, nombre, apellido FROM docentes WHERE estado = 1 ORDER BY apellido ASC`;
        const docentes = await queryAsync(sqlDocentes);

        res.render('contenedor_curso', { nombre: req.session.nombre, cursos: cursos, docentes: docentes });
    } catch (error) {
        console.error('Error al cargar cursos:', error);
        res.status(500).send('Error interno del servidor al cargar los cursos');
    }
});

app.get('/api/cursos', verificarSesion, (req, res) => {
    const query = `
        SELECT DISTINCT id_curso, nombre_curso, grado, anio
        FROM cursos
        ORDER BY grado, nombre_curso
    `;
    oConexion.query(query, (error, resultados) => {
        if (error) {
            console.error('Error en la consulta:', error);
            return res.status(500).json({ error: 'Error al obtener cursos' });
        }
        res.json(resultados);
    });
});

app.post('/crear_curso', verificarSesion, async (req, res) => {
    try {
        const { grado, nombre_curso, anio, id_docente } = req.body;
        if (!grado || !nombre_curso || !anio || !id_docente) {
            return res.send('Faltan datos para crear el curso, asegúrate de elegir un profesor.');
        }
        const sql = 'INSERT INTO cursos (grado, nombre_curso, anio, estado, id_docente) VALUES (?, ?, ?, 1, ?)';
        await queryAsync(sql, [grado, nombre_curso.toUpperCase(), anio, id_docente]);
        console.log(`Nuevo curso creado: ${grado}° ${nombre_curso.toUpperCase()} - Año ${anio} - Profe ID: ${id_docente}`);
        res.redirect('/cursos');
    } catch (error) {
        console.error('Error al crear curso:', error);
        res.status(500).send('Error al crear el curso (¿Quizás ya existe?)');
    }
});

app.post('/editar_curso', verificarSesion, async (req, res) => {
    try {
        const { id_curso, grado, nombre_curso, anio, id_docente } = req.body;
        if (!id_curso || !grado || !nombre_curso || !anio || !id_docente) {
            return res.send('Faltan datos para editar el curso');
        }
        const sql = `UPDATE cursos SET grado = ?, nombre_curso = ?, anio = ?, id_docente = ? WHERE id_curso = ?`;
        await queryAsync(sql, [grado, nombre_curso.toUpperCase(), anio, id_docente, id_curso]);
        console.log(`Curso actualizado ID: ${id_curso} con Profe ID: ${id_docente}`);
        res.redirect('/cursos');
    } catch (error) {
        console.error('Error al editar curso:', error);
        res.status(500).send('Error al actualizar el curso');
    }
});

app.get('/borrar_curso/:id', verificarSesion, async (req, res) => {
    try {
        const { id } = req.params;
        const sql = 'UPDATE cursos SET estado = 0 WHERE id_curso = ?';
        await queryAsync(sql, [id]);
        console.log(`Curso ID: ${id} desactivado (Soft Delete)`);
        res.redirect('/cursos');
    } catch (error) {
        console.error('Error al desactivar curso:', error);
        res.redirect('/cursos');
    }
});


// ==========================================
// 8. MÓDULO: ASIGNATURAS
// ==========================================

app.get('/asignaturas', verificarSesion, async (req, res) => {
    try {
        const sql = `SELECT id_asignatura, nombre_asignatura FROM asignaturas WHERE estado = 1 ORDER BY nombre_asignatura ASC`;
        const asignaturas = await queryAsync(sql);
        res.render('contenedor_asignaturas', { nombre: req.session.nombre, asignaturas: asignaturas });
    } catch (error) {
        console.error('Error al cargar asignaturas:', error);
        res.status(500).send('Error interno al cargar las asignaturas');
    }
});

app.get('/api/asignaturas', (req, res) => {
    const query = `SELECT DISTINCT nombre_asignatura FROM asignaturas WHERE estado = 1 ORDER BY nombre_asignatura`;
    oConexion.query(query, (error, resultados) => {
        if (error) {
            console.error('Error en la consulta:', error);
            return res.status(500).json({ error: 'Error al obtener asignaturas' });
        }
        res.json(resultados);
    });
});

app.get('/api/asignaturas_curso/:id_curso', verificarSesion, async (req, res) => {
    try {
        const { id_curso } = req.params;
        const sql = `
            SELECT DISTINCT a.id_asignatura, a.nombre_asignatura 
            FROM asignaturas a
            JOIN docente_asignatura da ON a.id_asignatura = da.id_asignatura
            WHERE da.id_curso = ? AND a.estado = 1
            ORDER BY a.nombre_asignatura ASC
        `;
        const asignaturas = await queryAsync(sql, [id_curso]);
        res.json(asignaturas);
    } catch (error) {
        console.error('Error al obtener asignaturas del curso:', error);
        res.status(500).json({ error: 'Error al obtener asignaturas' });
    }
});

app.post('/crear_asignatura', verificarSesion, async (req, res) => {
    try {
        const { nombre_asignatura } = req.body;
        if (!nombre_asignatura) return res.send('El nombre de la asignatura es obligatorio');
        const sql = 'INSERT INTO asignaturas (nombre_asignatura, estado) VALUES (?, 1)';
        await queryAsync(sql, [nombre_asignatura]);
        res.redirect('/asignaturas');
    } catch (error) {
        console.error('Error al crear asignatura:', error);
        res.status(500).send('Error al crear la asignatura (¿Quizás ya existe?)');
    }
});

app.post('/editar_asignatura', verificarSesion, async (req, res) => {
    try {
        const { id_asignatura, nombre_asignatura } = req.body;
        if (!id_asignatura || !nombre_asignatura) return res.send('Faltan datos obligatorios');
        const sql = `UPDATE asignaturas SET nombre_asignatura = ? WHERE id_asignatura = ?`;
        await queryAsync(sql, [nombre_asignatura, id_asignatura]);
        res.redirect('/asignaturas');
    } catch (error) {
        console.error('Error al editar asignatura:', error);
        res.status(500).send('Error al actualizar la asignatura');
    }
});

app.get('/borrar_asignatura/:id', verificarSesion, async (req, res) => {
    try {
        const { id } = req.params;
        const sql = 'UPDATE asignaturas SET estado = 0 WHERE id_asignatura = ?';
        await queryAsync(sql, [id]);
        res.redirect('/asignaturas');
    } catch (error) {
        console.error('Error al desactivar asignatura:', error);
        res.redirect('/asignaturas');
    }
});


// ==========================================
// 9. MÓDULO: PROFESORES / DOCENTES
// ==========================================

app.get('/profesores', verificarSesion, async (req, res) => {
    try {
        const sql = `SELECT id_docente, rut, nombre, apellido FROM docentes WHERE estado = 1 ORDER BY apellido ASC, nombre ASC`;
        const profesores = await queryAsync(sql);
        res.render('contenedor_profesores', { nombre: req.session.nombre, profesores: profesores });
    } catch (error) {
        console.error('Error al cargar profesores:', error);
        res.status(500).send('Error interno al cargar los profesores');
    }
});

app.get('/api/docentes', (req, res) => {
    const query = `SELECT id_docente, nombre, apellido FROM docentes WHERE estado = 1 ORDER BY apellido, nombre`;
    oConexion.query(query, (error, resultados) => {
        if (error) {
            console.error('Error en la consulta:', error);
            return res.status(500).json({ error: 'Error al obtener docentes' });
        }
        res.json(resultados);
    });
});

app.post('/crear_profesor', verificarSesion, async (req, res) => {
    try {
        const { rut, nombre, apellido } = req.body;
        if (!nombre || !apellido) return res.send('El nombre y apellido son obligatorios');
        const sql = 'INSERT INTO docentes (rut, nombre, apellido, estado) VALUES (?, ?, ?, 1)';
        await queryAsync(sql, [rut, nombre, apellido]);
        res.redirect('/profesores');
    } catch (error) {
        console.error('Error al crear profesor:', error);
        res.status(500).send('Error al crear el profesor (¿Quizás el RUT ya existe?)');
    }
});

app.post('/editar_profesor', verificarSesion, async (req, res) => {
    try {
        const { id_docente, rut, nombre, apellido } = req.body;
        if (!id_docente || !nombre || !apellido) return res.send('Faltan datos obligatorios');
        const sql = `UPDATE docentes SET rut = ?, nombre = ?, apellido = ? WHERE id_docente = ?`;
        await queryAsync(sql, [rut, nombre, apellido, id_docente]);
        res.redirect('/profesores');
    } catch (error) {
        console.error('Error al editar profesor:', error);
        res.status(500).send('Error al actualizar el profesor');
    }
});

app.get('/borrar_profesor/:id', verificarSesion, async (req, res) => {
    try {
        const { id } = req.params;
        const sql = 'UPDATE docentes SET estado = 0 WHERE id_docente = ?';
        await queryAsync(sql, [id]);
        res.redirect('/profesores');
    } catch (error) {
        console.error('Error al desactivar profesor:', error);
        res.redirect('/profesores');
    }
});


// ==========================================
// 10. MÓDULO: NOTAS Y EVALUACIONES (API)
// ==========================================

app.get('/api/notas',verificarSesion, (req, res) => {
    const { curso_id } = req.query;
    let query = `
        SELECT DISTINCT
            a.id_alumno, a.nombres, a.apellido_paterno, a.apellido_materno, a.rut,
            c.nombre_curso, c.grado, c.id_curso, asig.nombre_asignatura,
            n.evaluacion, n.nota, n.fecha, n.id_nota, n.nota_anterior, n.modificado_por,
            d.nombre AS nombre_docente, d.apellido AS apellido_docente
        FROM alumnos a
        LEFT JOIN cursos c ON a.curso_id = c.id_curso
        LEFT JOIN notas n ON a.id_alumno = n.id_alumno
        LEFT JOIN docente_asignatura da ON n.id_docente_asignatura = da.id_docente_asignatura
        LEFT JOIN asignaturas asig ON da.id_asignatura = asig.id_asignatura
        LEFT JOIN docentes d ON da.id_docente = d.id_docente
        WHERE n.id_nota IS NOT NULL AND a.estado = 1
    `;
    const params = [];
    if (curso_id) {
        query += ' AND a.curso_id = ?';
        params.push(curso_id);
    }
    query += ' ORDER BY a.apellido_paterno, a.nombres, n.fecha';
    oConexion.query(query, params, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al obtener datos' });
        res.json(resultados);
    });
});

app.get('/api/evaluaciones', verificarSesion, (req, res) => {
    const query = `
        SELECT DISTINCT n.evaluacion, asig.nombre_asignatura, n.fecha
        FROM notas n
        JOIN docente_asignatura da ON n.id_docente_asignatura = da.id_docente_asignatura
        JOIN asignaturas asig ON da.id_asignatura = asig.id_asignatura
        ORDER BY n.fecha, asig.nombre_asignatura
    `;
    oConexion.query(query, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al obtener evaluaciones' });
        res.json(resultados);
    });
});

app.post('/api/evaluaciones', async (req, res) => {
    const { nombre_asignatura, evaluacion, fecha, id_curso, id_docente } = req.body;
    if (!nombre_asignatura || !evaluacion || !fecha || !id_curso || !id_docente) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    try {
        let id_asignatura;
        const resAsignatura = await queryAsync('SELECT id_asignatura FROM asignaturas WHERE nombre_asignatura = ?', [nombre_asignatura]);
        if (resAsignatura.length > 0) {
            id_asignatura = resAsignatura[0].id_asignatura;
        } else {
            const insertAsig = await queryAsync('INSERT INTO asignaturas (nombre_asignatura) VALUES (?)', [nombre_asignatura]);
            id_asignatura = insertAsig.insertId;
        }

        let id_docente_asignatura;
        const resDocAsig = await queryAsync(
            'SELECT id_docente_asignatura FROM docente_asignatura WHERE id_asignatura = ? AND id_curso = ? AND id_docente = ? LIMIT 1',
            [id_asignatura, id_curso, id_docente]
        );
        if (resDocAsig.length > 0) {
            id_docente_asignatura = resDocAsig[0].id_docente_asignatura;
        } else {
            const insertDocAsig = await queryAsync(
                'INSERT INTO docente_asignatura (id_docente, id_asignatura, id_curso) VALUES (?, ?, ?)',
                [id_docente, id_asignatura, id_curso]
            );
            id_docente_asignatura = insertDocAsig.insertId;
        }

        const duplicados = await queryAsync(
            'SELECT COUNT(*) as count FROM notas WHERE id_docente_asignatura = ? AND evaluacion = ? AND DATE(fecha) = DATE(?)',
            [id_docente_asignatura, evaluacion, fecha]
        );
        if (duplicados[0].count > 0) {
            return res.status(400).json({ error: 'Esta evaluación ya existe para este curso y fecha.' });
        }

        const alumnos = await queryAsync('SELECT id_alumno FROM alumnos WHERE curso_id = ?', [id_curso]);
        if (alumnos.length === 0) {
            return res.json({ mensaje: 'Evaluación creada (pero el curso no tiene alumnos)', alumnos_afectados: 0 });
        }

        const promesasInsert = alumnos.map(alumno => {
            return queryAsync(
                'INSERT INTO notas (id_alumno, id_docente_asignatura, evaluacion, nota, fecha) VALUES (?, ?, ?, NULL, ?)',
                [alumno.id_alumno, id_docente_asignatura, evaluacion, fecha]
            );
        });
        await Promise.all(promesasInsert);

        res.json({ mensaje: 'Evaluación creada correctamente', alumnos_afectados: alumnos.length });
    } catch (error) {
        console.error('Error al crear evaluación:', error);
        res.status(500).json({ error: 'Error interno al crear evaluación' });
    }
});

app.delete('/api/evaluaciones', (req, res) => {
    const { asignatura, evaluacion, fecha } = req.body;
    if (!asignatura || !evaluacion || !fecha) return res.status(400).json({ error: 'Faltan datos requeridos' });
    
    const queryAsignatura = 'SELECT id_asignatura FROM asignaturas WHERE nombre_asignatura = ?';
    oConexion.query(queryAsignatura, [asignatura], (error, resultados) => {
        if (error || resultados.length === 0) return res.status(404).json({ error: 'Asignatura no encontrada' });
        
        const id_asignatura = resultados[0].id_asignatura;
        const queryDocAsig = 'SELECT id_docente_asignatura FROM docente_asignatura WHERE id_asignatura = ?';
        oConexion.query(queryDocAsig, [id_asignatura], (error, docAsigs) => {
            if (error) return res.status(500).json({ error: 'Error al buscar relaciones' });
            if (docAsigs.length === 0) return res.status(404).json({ error: 'No se encontraron evaluaciones' });
            
            const idsDocAsig = docAsigs.map(da => da.id_docente_asignatura);
            const queryDelete = `DELETE FROM notas WHERE id_docente_asignatura IN (?) AND evaluacion = ? AND fecha = ?`;
            oConexion.query(queryDelete, [idsDocAsig, evaluacion, fecha], (error, resultado) => {
                if (error) return res.status(500).json({ error: 'Error al eliminar evaluación' });
                res.json({ mensaje: 'Evaluación eliminada correctamente', notas_eliminadas: resultado.affectedRows });
            });
        });
    });
});

// Ruta para actualizar nota con respaldo de historial
app.put('/api/notas/:id', verificarSesion, async (req, res) => {
    const { id } = req.params;
    const { nota } = req.body;
    
    console.log(`\n--- GUARDANDO NOTA ID: ${id} ---`);

    if (nota && (nota < 1.0 || nota > 7.0)) {
        return res.status(400).json({ error: 'Nota inválida (debe estar entre 1.0 y 7.0)' });
    }
    
    try {
        // 1. Identificar quién está haciendo el cambio (usamos el username o nombre guardado en sesión)
        const usuarioModificador = (req.session && req.session.nombre) 
            ? req.session.nombre 
            : 'Profesor/Admin';

        // 2. Consultar la nota que el alumno tenía ANTES de este cambio
        const consultaPrevia = await queryAsync('SELECT nota FROM notas WHERE id_nota = ?', [id]);
        
        let notaAnterior = null;
        if (consultaPrevia.length > 0) {
            notaAnterior = consultaPrevia[0].nota;
        }

        // 3. Limpiamos los valores para comparar de forma segura y evitar el error de los "Null"
        const valorViejo = (notaAnterior !== null && notaAnterior !== '') ? parseFloat(notaAnterior) : null;
        const valorNuevo = (nota !== null && nota !== '') ? parseFloat(nota) : null;

        // 4. Verificamos que el profesor realmente haya cambiado el número
        if (valorViejo !== valorNuevo) {
            console.log(`📝 Cambio detectado: de ${valorViejo} a ${valorNuevo} por ${usuarioModificador}`);
            
            await queryAsync(`
                UPDATE notas 
                SET nota = ?, 
                    nota_anterior = ?, 
                    modificado_por = ?
                WHERE id_nota = ?
            `, [valorNuevo, valorViejo, usuarioModificador, id]);

        } else {
            console.log(`Igual: La nota es la misma (${valorNuevo}). Guardando sin gastar historial.`);
            await queryAsync('UPDATE notas SET nota = ? WHERE id_nota = ?', [valorNuevo, id]);
        }

        res.json({ success: true, mensaje: 'Nota actualizada y respaldada correctamente', nota: valorNuevo });

    } catch (error) {
        console.error('❌ Error al actualizar la nota y su respaldo:', error);
        res.status(500).json({ error: 'Error interno al actualizar la nota' });
    }
});




// ==========================================
// 11. MÓDULO: ASISTENCIAS
// ==========================================

app.get('/asistencias', verificarSesion, async (req, res) => {
    try {
        const cursos = await queryAsync('SELECT id_curso, grado, nombre_curso FROM cursos WHERE estado = 1 ORDER BY grado ASC, nombre_curso ASC');
        res.render('contenedor_asistencias', { nombre: req.session.nombre, cursos: cursos });
    } catch (error) {
        console.error('Error al cargar la vista de asistencias:', error);
        res.status(500).send('Error interno al cargar la página');
    }
});

app.post('/guardar_asistencias', verificarSesion, async (req, res) => {
    try {
        const { fecha, hora, curso_id, asignatura_id, asistencias } = req.body;
        if (!fecha || !hora || !curso_id || !asignatura_id || !asistencias) {
            return res.status(400).json({ success: false, mensaje: 'Faltan datos. Asegúrate de seleccionar la asignatura.' });
        }

        for (const [id_alumno, estado] of Object.entries(asistencias)) {
            const registroPrevio = await queryAsync(
                'SELECT estado FROM asistencias WHERE id_alumno = ? AND fecha = ? AND id_asignatura = ?', 
                [id_alumno, fecha, asignatura_id]
            );

            if (registroPrevio.length > 0) {
                if (registroPrevio[0].estado !== estado) {
                    await queryAsync(
                        'UPDATE asistencias SET estado = ?, hora = ? WHERE id_alumno = ? AND fecha = ? AND id_asignatura = ?', 
                        [estado, hora, id_alumno, fecha, asignatura_id]
                    );
                }
            } else {
                await queryAsync(
                    'INSERT INTO asistencias (id_alumno, id_asignatura, fecha, hora, estado) VALUES (?, ?, ?, ?, ?)', 
                    [id_alumno, asignatura_id, fecha, hora, estado]
                );
            }
        }
        res.json({ success: true, mensaje: '✅ Asistencia de la asignatura guardada' });

    } catch (error) {
        console.error('Error al guardar asistencias:', error);
        res.status(500).json({ success: false, mensaje: 'Error interno al guardar en la base de datos' });
    }
});

app.get('/api/historial_asistencia/:id_curso', verificarSesion, async (req, res) => {
    try {
        const { id_curso } = req.params;
        const sql = `
            SELECT a.rut, a.nombres, a.apellido_paterno, a.apellido_materno, ast.fecha, ast.hora, ast.estado, asig.nombre_asignatura
            FROM asistencias ast
            JOIN alumnos a ON ast.id_alumno = a.id_alumno
            LEFT JOIN asignaturas asig ON ast.id_asignatura = asig.id_asignatura
            WHERE a.curso_id = ?
            ORDER BY ast.fecha DESC, a.apellido_paterno ASC, a.nombres ASC
        `;
        const historial = await queryAsync(sql, [id_curso]);
        res.json(historial);
    } catch (error) {
        console.error('Error al obtener el historial:', error);
        res.status(500).json({ error: 'Error al obtener el historial' });
    }
});

app.get('/api/asistencia_fecha/:id_curso/:fecha/:id_asignatura', verificarSesion, async (req, res) => {
    try {
        const { id_curso, fecha, id_asignatura } = req.params;
        const sql = `
            SELECT ast.id_alumno, ast.estado 
            FROM asistencias ast
            JOIN alumnos a ON ast.id_alumno = a.id_alumno
            WHERE a.curso_id = ? AND ast.fecha = ? AND ast.id_asignatura = ?
        `;
        const asistencias = await queryAsync(sql, [id_curso, fecha, id_asignatura]);
        res.json(asistencias);
    } catch (error) {
        console.error('Error al obtener asistencia previa:', error);
        res.status(500).json({ error: 'Error al obtener datos previos' });
    }
});


// ==========================================
// 12. MÓDULO: ANOTACIONES
// ==========================================

app.get('/api/anotaciones', async (req, res) => {
    try {
        const { id_alumno, tipo, curso_id } = req.query;
        let query = `
           SELECT 
                an.id_anotacion, an.tipo, an.descripcion, an.fecha,
                a.id_alumno, a.nombres as alumno_nombres, a.apellido_paterno as alumno_apellido_paterno, a.apellido_materno as alumno_apellido_materno, a.rut,
                c.grado, c.nombre_curso, d.id_docente, d.nombre as docente_nombre, d.apellido as docente_apellido
            FROM anotaciones an
            INNER JOIN alumnos a ON an.id_alumno = a.id_alumno
            INNER JOIN docentes d ON an.id_docente = d.id_docente
            LEFT JOIN cursos c ON a.curso_id = c.id_curso
            WHERE 1=1
        `;
        const params = [];
        if (id_alumno) { query += ' AND an.id_alumno = ?'; params.push(id_alumno); }
        if (tipo) { query += ' AND an.tipo = ?'; params.push(tipo); }
        if (curso_id) { query += ' AND a.curso_id = ?'; params.push(curso_id); }
        
        query += ' ORDER BY an.fecha DESC, an.id_anotacion DESC';
        const resultados = await queryAsync(query, params);
        res.json(resultados);
    } catch (error) {
        console.error('Error al obtener anotaciones:', error);
        res.status(500).json({ error: 'Error al obtener anotaciones' });
    }
});

app.get('/api/anotaciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
           SELECT an.id_anotacion, an.tipo, an.descripcion, an.fecha, an.id_alumno, an.id_docente,
                a.nombres as alumno_nombres, a.apellido_paterno as alumno_apellido_paterno, a.apellido_materno as alumno_apellido_materno, a.rut,
                c.grado, c.nombre_curso, d.nombre as docente_nombre, d.apellido as docente_apellido
            FROM anotaciones an
            INNER JOIN alumnos a ON an.id_alumno = a.id_alumno
            INNER JOIN docentes d ON an.id_docente = d.id_docente
            LEFT JOIN cursos c ON a.curso_id = c.id_curso
            WHERE an.id_anotacion = ?
        `;
        const resultados = await queryAsync(query, [id]);
        if (resultados.length === 0) return res.status(404).json({ error: 'Anotación no encontrada' });
        res.json(resultados[0]);
    } catch (error) {
        console.error('Error al obtener anotación:', error);
        res.status(500).json({ error: 'Error al obtener anotación' });
    }
});

app.post('/api/anotaciones', async (req, res) => {
    try {
        const { id_alumno, id_docente, tipo, descripcion } = req.body;
        if (!id_alumno || !id_docente || !tipo || !descripcion) {
            return res.status(400).json({ error: 'Faltan datos requeridos (id_alumno, id_docente, tipo, descripcion)' });
        }
        if (tipo !== 'Positiva' && tipo !== 'Negativa' && tipo !== 'Informativa' ) {
            return res.status(400).json({ error: 'Tipo de anotación inválido. Debe ser "Positiva" o "Negativa"' });
        }
        if (descripcion.trim().length < 10) {
            return res.status(400).json({ error: 'La descripción debe tener al menos 10 caracteres' });
        }
        
        const alumnoExiste = await queryAsync('SELECT id_alumno FROM alumnos WHERE id_alumno = ?', [id_alumno]);
        if (alumnoExiste.length === 0) return res.status(404).json({ error: 'Alumno no encontrado' });
        
        const docenteExiste = await queryAsync('SELECT id_docente FROM docentes WHERE id_docente = ?', [id_docente]);
        if (docenteExiste.length === 0) return res.status(404).json({ error: 'Docente no encontrado' });
        
        const query = `INSERT INTO anotaciones (id_alumno, id_docente, tipo, descripcion, fecha) VALUES (?, ?, ?, ?, NOW())`;
        const resultado = await queryAsync(query, [id_alumno, id_docente, tipo, descripcion]);
        
        res.status(201).json({ mensaje: 'Anotación creada correctamente', id_anotacion: resultado.insertId });
    } catch (error) {
        console.error('Error al crear anotación:', error);
        res.status(500).json({ error: 'Error al crear anotación' });
    }
});

app.put('/api/anotaciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, descripcion } = req.body;
        
        if (!tipo || !descripcion) return res.status(400).json({ error: 'Faltan datos requeridos (tipo, descripcion)' });
        if (tipo !== 'Positiva' && tipo !== 'Negativa' && tipo !== 'Informativa') {
            return res.status(400).json({ error: 'Tipo de anotación inválido. Debe ser "Positiva", "Negativa" o "Informativa"' });
        }
        if (descripcion.trim().length < 10) return res.status(400).json({ error: 'La descripción debe tener al menos 10 caracteres' });
        
        const anotacionExiste = await queryAsync('SELECT id_anotacion FROM anotaciones WHERE id_anotacion = ?', [id]);
        if (anotacionExiste.length === 0) return res.status(404).json({ error: 'Anotación no encontrada' });
        
        const query = `UPDATE anotaciones SET tipo = ?, descripcion = ? WHERE id_anotacion = ?`;
        await queryAsync(query, [tipo, descripcion, id]);
        res.json({ mensaje: 'Anotación actualizada correctamente' });
    } catch (error) {
        console.error('Error al actualizar anotación:', error);
        res.status(500).json({ error: 'Error al actualizar anotación' });
    }
});

app.delete('/api/anotaciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const anotacionExiste = await queryAsync('SELECT id_anotacion FROM anotaciones WHERE id_anotacion = ?', [id]);
        if (anotacionExiste.length === 0) return res.status(404).json({ error: 'Anotación no encontrada' });
        
        await queryAsync('DELETE FROM anotaciones WHERE id_anotacion = ?', [id]);
        res.json({ mensaje: 'Anotación eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar anotación:', error);
        res.status(500).json({ error: 'Error al eliminar anotación' });
    }
});

app.get('/api/anotaciones/estadisticas/:id_alumno', async (req, res) => {
    try {
        const { id_alumno } = req.params;
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN tipo = 'Positiva' THEN 1 ELSE 0 END) as positivas,
                SUM(CASE WHEN tipo = 'Negativa' THEN 1 ELSE 0 END) as negativas,
                SUM(CASE WHEN tipo = 'informativa' THEN 1 ELSE 0 END) as informativas 
            FROM anotaciones
            WHERE id_alumno = ?
        `;
        const resultados = await queryAsync(query, [id_alumno]);
        res.json(resultados[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});


// ==========================================
// 13. MÓDULO: HISTORIAL Y CALIFICACIONES (REPORTE)
// ==========================================

app.get('/calificaciones', verificarSesion, (req, res) => {
    res.render('calificaciones', { nombre: req.session.nombre, rol: req.session.rol });
});

// Ruta para obtener las calificaciones de un alumno específico, con detalles completos
app.get('/api/calificaciones/:id_alumno', verificarSesion, async (req, res) => {
    try {
        const { id_alumno } = req.params;
        
        const sql = `
            SELECT 
                n.id_nota, n.nota, n.evaluacion, n.fecha,
                a.id_alumno, a.nombres, a.apellido_paterno, a.apellido_materno, a.rut,
                asig.nombre_asignatura, c.grado, c.nombre_curso,
                d.nombre as docente_nombre, d.apellido as docente_apellido,
                dj.nombre as profe_jefe_nombre, dj.apellido as profe_jefe_apellido
            FROM notas n
            INNER JOIN alumnos a ON n.id_alumno = a.id_alumno
            INNER JOIN docente_asignatura da ON n.id_docente_asignatura = da.id_docente_asignatura
            INNER JOIN asignaturas asig ON da.id_asignatura = asig.id_asignatura
            INNER JOIN cursos c ON a.curso_id = c.id_curso
            INNER JOIN docentes d ON da.id_docente = d.id_docente
            LEFT JOIN docentes dj ON c.id_docente = dj.id_docente
            WHERE a.id_alumno = ?
            ORDER BY asig.nombre_asignatura, n.fecha DESC
        `;
        
        const resultados = await queryAsync(sql, [id_alumno]);
        res.json(resultados);
        
    } catch (error) {
        console.error('Error al obtener calificaciones:', error);
        res.status(500).json({ error: 'Error al obtener calificaciones' });
    }
});

app.get('/historial_notas', soloAdmin, (req, res) => {
    res.render('contenedor_historial_notas', { nombre: req.session.nombre, rol: req.session.rol });
});

app.get('/api/historial_notas', soloAdmin, async (req, res) => {
    try {
        const sql = `
           SELECT 
                n.fecha AS fecha_del_cambio, n.modificado_por,
                a.rut AS rut_alumno, a.nombres AS nombre_alumno, a.apellido_paterno AS apellido_alumno,
                c.grado, c.nombre_curso AS letra_curso,
                asig.nombre_asignatura,
                d.nombre AS nombre_profesor, d.apellido AS apellido_profesor,
                n.evaluacion, n.nota_anterior, n.nota AS nota_nueva
            FROM notas n
            JOIN alumnos a ON n.id_alumno = a.id_alumno
            JOIN cursos c ON a.curso_id = c.id_curso
            JOIN docente_asignatura da ON n.id_docente_asignatura = da.id_docente_asignatura
            JOIN docentes d ON da.id_docente = d.id_docente
            JOIN asignaturas asig ON da.id_asignatura = asig.id_asignatura
            WHERE n.modificado_por IS NOT NULL
            ORDER BY n.fecha DESC;
        `;
        const historial = await queryAsync(sql);
        res.json(historial);
    } catch (error) {
        console.error('Error al obtener el historial de notas:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});


// ==========================================
// 14. UTILIDADES Y MANEJO DE ERRORES
// ==========================================

app.get('/debug-session', (req, res) => {
    res.json({
        sessionExists: !!req.session,
        sessionData: req.session,
        cookies: req.headers.cookie
    });
});

app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).send('Error interno del servidor');
});


// ==========================================
// 15. INICIO DEL SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✓ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`✓ Prueba con: http://localhost:${PORT}/inicio\n`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    oConexion.end();
    process.exit(0);
});