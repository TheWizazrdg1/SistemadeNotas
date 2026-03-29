const API_URL = `${window.location.origin}/api`;

// Elementos del DOM (Filtros Principales)
const filtroCurso = document.getElementById('filtroCurso');
const filtroLetra = document.getElementById('filtroLetra');
const filtroAlumno = document.getElementById('filtroAlumno');
const filtroTipo = document.getElementById('filtroTipo');
const inputBuscarRut = document.getElementById('inputBuscarRut');
const btnBuscarRut = document.getElementById('btnBuscarRut');
const sugerenciasRut = document.getElementById('sugerenciasRut');
const btnLimpiar = document.getElementById('btnLimpiar');

// Elementos del DOM (Modal de Filtros)
const filtroModalCurso = document.getElementById('filtroModalCurso');
const filtroModalLetra = document.getElementById('filtroModalLetra');
const buscadorModalAlumno = document.getElementById('buscadorModalAlumno');
const selectModalAlumno = document.getElementById('modalAlumno');

// Elementos Generales
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const btnNuevaAnotacion = document.getElementById('btnNuevaAnotacion');
const contenedorAnotaciones = document.getElementById('contenedorAnotaciones');

// Info del alumno y Estadísticas
const infoAlumno = document.getElementById('infoAlumno');
const alumnoNombre = document.getElementById('alumnoNombre');
const alumnoRut = document.getElementById('alumnoRut');
const alumnoCurso = document.getElementById('alumnoCurso');
const statPositivas = document.getElementById('statPositivas');
const statNegativas = document.getElementById('statNegativas');
const statInformativas = document.getElementById('statInformativas');

// Modales
const modalNuevaAnotacion = document.getElementById('modalNuevaAnotacion');
const modalEditarAnotacion = document.getElementById('modalEditarAnotacion');
const closeModalNueva = document.getElementById('closeModalNueva');
const closeModalEditar = document.getElementById('closeModalEditar');

// Variables globales
let todosLosAlumnos = [];
let todosLosDocentes = [];
let todasLasAnotaciones = [];
let alumnoSeleccionado = null;
let buscadorRut = null;

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarCursos();
    cargarAlumnos();
    cargarDocentes();
    cargarAnotaciones();
});

// Event Listeners - Modales
closeModalEditar.addEventListener("click", () => {
    modalEditarAnotacion.style.display = "none";
});

closeModalNueva.addEventListener("click", () => {
    modalNuevaAnotacion.style.display = "none";
});

// Event Listeners - Filtros del Modal
filtroModalCurso.addEventListener('change', filtrarAlumnosModal);
filtroModalLetra.addEventListener('change', filtrarAlumnosModal);
buscadorModalAlumno.addEventListener('input', filtrarAlumnosModal);

// Event Listeners - Botones Principales
btnNuevaAnotacion.addEventListener('click', abrirModalNueva);
btnCerrarSesion.addEventListener('click', cerrarSesion);
btnLimpiar.addEventListener('click', limpiarFiltros);
filtroTipo.addEventListener('change', cargarAnotaciones);

// Event Listeners - Filtros Principales
filtroCurso.addEventListener('change', () => {
    aplicarFiltrosAlumnos();      
    filtroAlumno.value = "";      
    infoAlumno.style.display = 'none'; 
    contenedorAnotaciones.innerHTML = '<div class="no-data"><p>👆 Selecciona un alumno</p></div>';
});

filtroLetra.addEventListener('change', () => {
    aplicarFiltrosAlumnos();
    filtroAlumno.value = "";
    infoAlumno.style.display = 'none';
    contenedorAnotaciones.innerHTML = '<div class="no-data"><p>👆 Selecciona un alumno</p></div>';
});

filtroAlumno.addEventListener('change', seleccionarAlumnoPorSelect);

document.getElementById('btnGuardarAnotacion').addEventListener('click', guardarNuevaAnotacion);
document.getElementById('btnActualizarAnotacion').addEventListener('click', actualizarAnotacion);
document.getElementById('btnEliminarAnotacion').addEventListener('click', eliminarAnotacion);

if (btnBuscarRut) {
    btnBuscarRut.addEventListener('click', buscarPorRutDirecto);
}


// ===== CARGA INICIAL DE DATOS =====

async function cargarCursos() {
    try {
        const response = await fetch(`${API_URL}/cursos`);
        if (!response.ok) throw new Error('Error al cargar cursos');
        
        const cursos = await response.json();
        
        const grados = new Set();
        const letras = new Set();
        
        cursos.forEach(curso => {
            if (curso.grado) grados.add(curso.grado);
            if (curso.nombre_curso) letras.add(curso.nombre_curso);
        });
        
        // Llenar select de Cursos Principal
        filtroCurso.innerHTML = '<option value="">Todos los cursos</option>';
        Array.from(grados).sort((a, b) => a - b).forEach(grado => {
            filtroCurso.innerHTML += `<option value="${grado}">${grado}° Medio</option>`;
        });
        
        // Llenar select de Letras Principal
        filtroLetra.innerHTML = '<option value="">Todas</option>';
        Array.from(letras).sort().forEach(letra => {
            filtroLetra.innerHTML += `<option value="${letra}">${letra}</option>`;
        });

    } catch (error) {
        console.error('Error al cargar cursos:', error);
    }
}

async function cargarAlumnos() {
    try {
        const response = await fetch(`${API_URL}/alumnos`);
        if (!response.ok) throw new Error('Error al cargar alumnos');
        
        todosLosAlumnos = await response.json();
        
        // Inicializar el buscador de RUT
        inicializarBuscadorRut();

        // Aplicamos los filtros principales a la pantalla de fondo
        aplicarFiltrosAlumnos();
        
        // Llenamos los mini-filtros de curso y letra dentro del Modal
        llenarFiltrosModal(todosLosAlumnos);

        // Llenamos la lista del selector grande dentro del modal
        filtrarAlumnosModal(); 
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar la lista de alumnos');
    }
}

async function cargarDocentes() {
    try {
        const response = await fetch(`${API_URL}/docentes`);
        if (!response.ok) throw new Error('Error al cargar docentes');
        
        todosLosDocentes = await response.json();
        
        const modalDocente = document.getElementById('modalDocente');
        modalDocente.innerHTML = '<option value="">Seleccionar docente...</option>';
        todosLosDocentes.forEach(docente => {
            const option = document.createElement('option');
            option.value = docente.id_docente;
            option.textContent = `${docente.nombre} ${docente.apellido}`;
            modalDocente.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar docentes:', error);
    }
}

async function cargarAnotaciones() {
    try {
        mostrarCargando();
        
        let url = `${API_URL}/anotaciones`;
        const params = new URLSearchParams();
        
        if (alumnoSeleccionado) {
            params.append('id_alumno', alumnoSeleccionado.id_alumno);
        }
        
        if (filtroTipo.value) {
            params.append('tipo', filtroTipo.value);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar anotaciones');
        
        todasLasAnotaciones = await response.json();
        mostrarAnotaciones(todasLasAnotaciones);
        
        if (alumnoSeleccionado) {
            await cargarEstadisticas(alumnoSeleccionado.id_alumno);
        }
    } catch (error) {
        console.error('Error al cargar anotaciones:', error);
        mostrarError('Error al cargar las anotaciones');
    }
}

async function cargarEstadisticas(idAlumno) {
    try {
        const response = await fetch(`${API_URL}/anotaciones/estadisticas/${idAlumno}`);
        if (!response.ok) throw new Error('Error al cargar estadísticas');
        
        const stats = await response.json();
        statPositivas.textContent = stats.positivas || 0;
        statNegativas.textContent = stats.negativas || 0;
        if(statInformativas) statInformativas.textContent = stats.informativas || 0;
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}


// ===== FILTROS Y SELECTORES (PANTALLA PRINCIPAL) =====

function aplicarFiltrosAlumnos() {
    const gradoSeleccionado = filtroCurso.value;
    const letraSeleccionada = filtroLetra.value;
    
    let alumnosFiltrados = todosLosAlumnos.filter(alumno => {
        let coincideGrado = true;
        if (gradoSeleccionado !== "") {
            if (!alumno.grado) coincideGrado = false;
            else coincideGrado = String(alumno.grado) === String(gradoSeleccionado);
        }

        let coincideLetra = true;
        if (letraSeleccionada !== "") {
            if (!alumno.nombre_curso) coincideLetra = false;
            else coincideLetra = String(alumno.nombre_curso).trim().toUpperCase() === String(letraSeleccionada).trim().toUpperCase();
        }
        
        return coincideGrado && coincideLetra;
    });
    
    filtroAlumno.innerHTML = '<option value="">Todos los alumnos</option>';
    
    if (alumnosFiltrados.length > 0) {
        alumnosFiltrados.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));

        alumnosFiltrados.forEach(alumno => {
            const option = document.createElement('option');
            option.value = alumno.id_alumno;
            const textoCurso = alumno.grado ? ` (${alumno.grado}° ${alumno.nombre_curso})` : ' (Sin curso)';
            option.textContent = `${alumno.apellido_paterno} ${alumno.apellido_materno || ''}, ${alumno.nombres}${textoCurso}`;
            filtroAlumno.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.textContent = "❌ No hay alumnos con estos filtros";
        filtroAlumno.appendChild(option);
    }
    
    if (buscadorRut) {
        buscadorRut.actualizarAlumnos(alumnosFiltrados);
    }
}

function seleccionarAlumnoPorSelect() {
    const idAlumno = filtroAlumno.value;
    
    if (!idAlumno) {
        alumnoSeleccionado = null;
        infoAlumno.style.display = 'none';
        cargarAnotaciones();
        return;
    }
    
    alumnoSeleccionado = todosLosAlumnos.find(a => a.id_alumno == idAlumno);
    
    if (alumnoSeleccionado) {
        alumnoNombre.textContent = `${alumnoSeleccionado.nombres} ${alumnoSeleccionado.apellido_paterno} ${alumnoSeleccionado.apellido_materno || ''}`;
        alumnoRut.textContent = window.RutValidator ? 
            window.RutValidator.formatear(alumnoSeleccionado.rut) : 
            alumnoSeleccionado.rut;
        alumnoCurso.textContent = alumnoSeleccionado.grado ? 
            `${alumnoSeleccionado.grado}° ${alumnoSeleccionado.nombre_curso}` : 
            'Sin curso';
        infoAlumno.style.display = 'block';
    }
    
    cargarAnotaciones();
}


// ===== FILTROS Y SELECTORES (DENTRO DEL MODAL) =====

function llenarFiltrosModal(alumnos) {
    const grados = new Set();
    const letras = new Set();
    
    alumnos.forEach(a => {
        if (a.grado) grados.add(a.grado);
        if (a.nombre_curso) letras.add(a.nombre_curso);
    });
    
    filtroModalCurso.innerHTML = '<option value="">Todos</option>';
    Array.from(grados).sort((a,b) => a-b).forEach(g => {
        filtroModalCurso.innerHTML += `<option value="${g}">${g}° Medio</option>`;
    });

    filtroModalLetra.innerHTML = '<option value="">Todas</option>';
    Array.from(letras).sort().forEach(l => {
        filtroModalLetra.innerHTML += `<option value="${l}">${l}</option>`;
    });
}

function filtrarAlumnosModal() {
    const gradoSelect = filtroModalCurso.value;
    const letraSelect = filtroModalLetra.value;
    const textoBuscado = buscadorModalAlumno.value.toLowerCase().trim();

    const alumnosFiltrados = todosLosAlumnos.filter(alumno => {
        const coincideGrado = gradoSelect === "" || String(alumno.grado) === String(gradoSelect);
        const coincideLetra = letraSelect === "" || String(alumno.nombre_curso).toUpperCase() === String(letraSelect).toUpperCase();
        
        const nombreCompleto = `${alumno.nombres} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.toLowerCase();
        const rutCompleto = alumno.rut.toLowerCase();
        const coincideTexto = textoBuscado === "" || nombreCompleto.includes(textoBuscado) || rutCompleto.includes(textoBuscado);

        return coincideGrado && coincideLetra && coincideTexto;
    });

    selectModalAlumno.innerHTML = '<option value="">Seleccionar alumno...</option>';
    
    alumnosFiltrados.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));

    alumnosFiltrados.forEach(alumno => {
        const option = document.createElement('option');
        option.value = alumno.id_alumno;
        option.textContent = `${alumno.apellido_paterno} ${alumno.apellido_materno || ''}, ${alumno.nombres} (${alumno.grado ? alumno.grado+'° '+alumno.nombre_curso : 'Sin curso'})`;
        selectModalAlumno.appendChild(option);
    });
}


// ===== RENDERIZAR ANOTACIONES =====

function mostrarAnotaciones(anotaciones) {
    if (!anotaciones || anotaciones.length === 0) {
        contenedorAnotaciones.innerHTML = `
            <div class="no-data">
                <p>📋 No hay anotaciones registradas con los filtros seleccionados</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    anotaciones.forEach(anotacion => {
        let tipoClass = 'informativa'; 
        let icono = '📖';

        if (anotacion.tipo === 'Positiva') {
            tipoClass = 'positiva';
            icono = '✅';
        } else if (anotacion.tipo === 'Negativa') {
            tipoClass = 'negativa';
            icono = '❌';
        }

        const fecha = new Date(anotacion.fecha).toLocaleDateString('es-CL', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        
        html += `
            <div class="anotacion-card ${tipoClass}">
                <div class="anotacion-header">
                    <div class="anotacion-tipo">
                        ${icono} <strong>${anotacion.tipo.toUpperCase()}</strong>
                    </div>
                    <div class="anotacion-fecha">
                        📅 ${fecha}
                    </div>
                </div>
                <div class="anotacion-body">
                    <div class="anotacion-alumno">
                        <strong>${anotacion.alumno_nombres} ${anotacion.alumno_apellido_paterno} ${anotacion.alumno_apellido_materno || ''}</strong>
                        ${anotacion.grado ? `<span class="curso-badge">${anotacion.grado}° ${anotacion.nombre_curso}</span>` : ''}
                    </div>
                    <div class="anotacion-descripcion">
                        ${anotacion.descripcion}
                    </div>
                    <div class="anotacion-footer">
                        <span class="docente">
                            👨‍🏫 Prof. ${anotacion.docente_nombre} ${anotacion.docente_apellido}
                        </span>
                        <button class="btn-editar-small" onclick="abrirModalEditar(${anotacion.id_anotacion})">
                            ✏️ Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    contenedorAnotaciones.innerHTML = html;
}


// ===== BÚSQUEDA POR RUT =====

function buscarPorRutDirecto() {
    const rutIngresado = inputBuscarRut.value.trim();
    
    if (rutIngresado.length === 0) {
        mostrarMensaje('Por favor ingresa un RUT', 'warning');
        return;
    }
    
    if (!window.RutValidator) return;
    
    const esValido = window.RutValidator.validar(rutIngresado);
    
    if (!esValido) {
        mostrarMensaje('❌ El RUT ingresado no es válido', 'error');
        inputBuscarRut.classList.add('rut-invalido');
        return;
    }
    
    inputBuscarRut.classList.remove('rut-invalido');
    inputBuscarRut.classList.add('rut-valido');
    
    const rutLimpio = window.RutValidator.limpiar(rutIngresado);
    const alumnoEncontrado = todosLosAlumnos.find(alumno => window.RutValidator.limpiar(alumno.rut) === rutLimpio);
    
    if (!alumnoEncontrado) {
        mostrarMensaje('❌ No se encontró ningún alumno con ese RUT', 'error');
        return;
    }
    
    seleccionarAlumnoPorRut(alumnoEncontrado);
    mostrarMensaje(`✅ Alumno encontrado: ${alumnoEncontrado.nombres} ${alumnoEncontrado.apellido_paterno}`, 'success');
}

function seleccionarAlumnoPorRut(alumno) {
    if (window.RutValidator) {
        inputBuscarRut.value = window.RutValidator.formatear(alumno.rut);
        inputBuscarRut.classList.add('rut-valido');
    }
    
    if (alumno.grado) {
        filtroCurso.value = alumno.grado;
        aplicarFiltrosAlumnos();
    }
    if (alumno.nombre_curso) {
        filtroLetra.value = alumno.nombre_curso;
        aplicarFiltrosAlumnos();
    }
    
    filtroAlumno.value = alumno.id_alumno;
    if (sugerenciasRut) sugerenciasRut.style.display = 'none';
    
    seleccionarAlumnoPorSelect();
}

function inicializarBuscadorRut() {
    if (window.RutValidator && window.RutValidator.BuscadorRut && inputBuscarRut && sugerenciasRut) {
        buscadorRut = new window.RutValidator.BuscadorRut({
            inputElement: inputBuscarRut,
            sugerenciasElement: sugerenciasRut,
            alumnos: todosLosAlumnos,
            onSelect: seleccionarAlumnoPorRut,
            minCaracteres: 2,
            validarFormato: true
        });
    }
}


// ===== MANEJO DE MODALES Y CRUD =====

function abrirModalNueva() {
    if (alumnoSeleccionado) {
        selectModalAlumno.value = alumnoSeleccionado.id_alumno;
    }
    modalNuevaAnotacion.style.display = 'block';
}

function cerrarModalNueva() {
    modalNuevaAnotacion.style.display = 'none';
    selectModalAlumno.value = '';
    document.getElementById('modalDocente').value = '';
    document.getElementById('modalTipo').value = '';
    document.getElementById('modalDescripcion').value = '';
}

async function abrirModalEditar(idAnotacion) {
    try {
        const response = await fetch(`${API_URL}/anotaciones/${idAnotacion}`);
        if (!response.ok) throw new Error('Error al cargar anotación');
        
        const anotacion = await response.json();
        
        document.getElementById('editIdAnotacion').value = anotacion.id_anotacion;
        document.getElementById('editAlumnoNombre').textContent = `${anotacion.alumno_nombres} ${anotacion.alumno_apellido_paterno} ${anotacion.alumno_apellido_materno || ''}`;
        document.getElementById('editDocenteNombre').textContent = `${anotacion.docente_nombre} ${anotacion.docente_apellido}`;
        document.getElementById('editFecha').textContent = new Date(anotacion.fecha).toLocaleDateString('es-CL');
        document.getElementById('editTipo').value = anotacion.tipo;
        document.getElementById('editDescripcion').value = anotacion.descripcion;
        
        modalEditarAnotacion.style.display = 'block';
    } catch (error) {
        mostrarMensaje('Error al cargar la anotación', 'error');
    }
}

async function guardarNuevaAnotacion() {
    const idAlumno = selectModalAlumno.value;
    const idDocente = document.getElementById('modalDocente').value;
    const tipo = document.getElementById('modalTipo').value;
    const descripcion = document.getElementById('modalDescripcion').value.trim();
    
    if (!idAlumno || !idDocente || !tipo || !descripcion) {
        mostrarMensaje('Por favor completa todos los campos', 'warning');
        return;
    }
    
    if (descripcion.length < 10) {
        mostrarMensaje('La descripción debe tener al menos 10 caracteres', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/anotaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_alumno: idAlumno, id_docente: idDocente, tipo: tipo, descripcion: descripcion })
        });
        
        if (!response.ok) throw new Error('Error al guardar');
        
        cerrarModalNueva();
        mostrarMensaje('✅ Anotación creada correctamente', 'success');
        cargarAnotaciones();
    } catch (error) {
        mostrarMensaje('Error al crear la anotación', 'error');
    }
}

async function actualizarAnotacion() {
    const idAnotacion = document.getElementById('editIdAnotacion').value;
    const tipo = document.getElementById('editTipo').value;
    const descripcion = document.getElementById('editDescripcion').value.trim();
    
    if (!tipo || !descripcion) return mostrarMensaje('Por favor completa todos los campos', 'warning');
    if (descripcion.length < 10) return mostrarMensaje('La descripción debe tener al menos 10 caracteres', 'warning');
    
    try {
        const response = await fetch(`${API_URL}/anotaciones/${idAnotacion}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: tipo, descripcion: descripcion })
        });
        
        if (!response.ok) throw new Error('Error al actualizar');
        
        modalEditarAnotacion.style.display = 'none';
        mostrarMensaje('✅ Anotación actualizada correctamente', 'success');
        cargarAnotaciones();
    } catch (error) {
        mostrarMensaje('Error al actualizar la anotación', 'error');
    }
}

async function eliminarAnotacion() {
    if (!confirm('¿Estás seguro de eliminar esta anotación?')) return;
    
    const idAnotacion = document.getElementById('editIdAnotacion').value;
    
    try {
        const response = await fetch(`${API_URL}/anotaciones/${idAnotacion}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar');
        
        modalEditarAnotacion.style.display = 'none';
        mostrarMensaje('✅ Anotación eliminada correctamente', 'success');
        cargarAnotaciones();
    } catch (error) {
        mostrarMensaje('Error al eliminar la anotación', 'error');
    }
}


// ===== UTILIDADES MENORES =====

function limpiarFiltros() {
    filtroCurso.value = '';
    filtroLetra.value = '';
    filtroAlumno.value = '';
    filtroTipo.value = '';
    
    if (inputBuscarRut) {
        inputBuscarRut.value = '';
        inputBuscarRut.classList.remove('rut-valido', 'rut-invalido');
    }
    
    alumnoSeleccionado = null;
    infoAlumno.style.display = 'none';
    aplicarFiltrosAlumnos();
    cargarAnotaciones();
}

function mostrarCargando() {
    contenedorAnotaciones.innerHTML = `<div class="loading"><div class="spinner"></div><p>Cargando anotaciones...</p></div>`;
}

function mostrarError(mensaje) {
    contenedorAnotaciones.innerHTML = `<div class="no-data" style="color: #dc3545;"><p>⚠️ ${mensaje}</p></div>`;
}

function mostrarMensaje(mensaje, tipo = 'info') {
    const colores = { success: '#28a745', error: '#dc3545', warning: '#ffc107', info: '#17a2b8' };
    const div = document.createElement('div');
    div.className = 'mensaje-toast';
    div.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${colores[tipo]}; color: white; padding: 15px 25px; border-radius: 8px; z-index: 10000; font-weight: 500;`;
    div.textContent = mensaje;
    document.body.appendChild(div);
    setTimeout(() => { div.remove(); }, 3000);
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        window.location.href = '/logout';
    }
}

// Hacer accesible globalmente para el botón "Editar" en el HTML
window.abrirModalEditar = abrirModalEditar;