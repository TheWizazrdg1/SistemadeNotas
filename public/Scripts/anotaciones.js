const API_URL = `${window.location.origin}/api`;

// Elementos del DOM
const filtroCurso = document.getElementById('filtroCurso');
const filtroLetra = document.getElementById('filtroLetra');
const filtroAlumno = document.getElementById('filtroAlumno');
const filtroTipo = document.getElementById('filtroTipo');
const inputBuscarRut = document.getElementById('inputBuscarRut');
const btnBuscarRut = document.getElementById('btnBuscarRut');
const sugerenciasRut = document.getElementById('sugerenciasRut');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const btnNuevaAnotacion = document.getElementById('btnNuevaAnotacion');
const contenedorAnotaciones = document.getElementById('contenedorAnotaciones');
// Al inicio del archivo, junto a statPositivas
const statInformativas = document.getElementById('statInformativas');
// Info del alumno
const infoAlumno = document.getElementById('infoAlumno');
const alumnoNombre = document.getElementById('alumnoNombre');
const alumnoRut = document.getElementById('alumnoRut');
const alumnoCurso = document.getElementById('alumnoCurso');
const statPositivas = document.getElementById('statPositivas');
const statNegativas = document.getElementById('statNegativas');

// Modales
const modalNuevaAnotacion = document.getElementById('modalNuevaAnotacion');
const modalEditarAnotacion = document.getElementById('modalEditarAnotacion');
const closeModalNueva = document.getElementById('closeModalNueva');
const closeModalEditar = document.getElementById('closeModalEditar');

closeModalEditar.addEventListener("click", () =>{
    modalEditarAnotacion.style.display = "none";

})
closeModalNueva.addEventListener("click",()=>{
    modalNuevaAnotacion.style.display = "none";
})

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

// Event Listeners
//filtroCurso.addEventListener('change', aplicarFiltrosAlumnos);
//filtroLetra.addEventListener('change', aplicarFiltrosAlumnos);
//filtroAlumno.addEventListener('change', seleccionarAlumnoPorSelect);
//filtroTipo.addEventListener('change', cargarAnotaciones);
//btnLimpiar.addEventListener('click', limpiarFiltros);
//btnCerrarSesion.addEventListener('click', cerrarSesion);
btnNuevaAnotacion.addEventListener('click', abrirModalNueva);
//btnBuscarRut.addEventListener('click', buscarPorRutDirecto);
//inputBuscarRut.addEventListener('keypress', (e) => {
  //  if (e.key === 'Enter') {
    //    e.preventDefault();
      //  buscarPorRutDirecto();
   // }
//});
// ==========================================
// EVENT LISTENERS CORREGIDOS
// ==========================================

// 1. Cuando cambia el Curso
filtroCurso.addEventListener('change', () => {
    // OPCIONAL: Descomenta la siguiente línea si quieres que al cambiar de curso se reinicie la letra
    // filtroLetra.value = ""; 
    
    aplicarFiltrosAlumnos();      
    filtroAlumno.value = "";      // Reseteamos el alumno seleccionado
    infoAlumno.style.display = 'none'; // Ocultamos la ficha
    contenedorAnotaciones.innerHTML = '<div class="no-data"><p>👆 Selecciona un alumno</p></div>';
});

// 2. Cuando cambia la Letra
filtroLetra.addEventListener('change', () => {
    aplicarFiltrosAlumnos();
    filtroAlumno.value = "";
    infoAlumno.style.display = 'none';
    contenedorAnotaciones.innerHTML = '<div class="no-data"><p>👆 Selecciona un alumno</p></div>';
});

// 3. Cuando se elige un alumno del select
filtroAlumno.addEventListener('change', seleccionarAlumnoPorSelect);

// 4. Botón Limpiar
btnLimpiar.addEventListener('click', limpiarFiltros);

// 5. Filtro por Tipo de anotación
filtroTipo.addEventListener('change', cargarAnotaciones);

document.getElementById('btnGuardarAnotacion').addEventListener('click', guardarNuevaAnotacion);
document.getElementById('btnActualizarAnotacion').addEventListener('click', actualizarAnotacion);
document.getElementById('btnEliminarAnotacion').addEventListener('click', eliminarAnotacion);

// ===== BÚSQUEDA POR RUT =====
function buscarPorRutDirecto() {
    console.log('🔍 Iniciando búsqueda por RUT...');
    
    const rutIngresado = inputBuscarRut.value.trim();
    
    if (rutIngresado.length === 0) {
        mostrarMensaje('Por favor ingresa un RUT', 'warning');
        inputBuscarRut.focus();
        return;
    }
    
    if (!window.RutValidator) {
        mostrarMensaje('Error: Sistema de validación no disponible', 'error');
        return;
    }
    
    const esValido = window.RutValidator.validar(rutIngresado);
    
    if (!esValido) {
        mostrarMensaje('❌ El RUT ingresado no es válido', 'error');
        inputBuscarRut.classList.add('rut-invalido');
        inputBuscarRut.classList.remove('rut-valido');
        return;
    }
    
    inputBuscarRut.classList.remove('rut-invalido');
    inputBuscarRut.classList.add('rut-valido');
    
    const rutLimpio = window.RutValidator.limpiar(rutIngresado);
    
    const alumnoEncontrado = todosLosAlumnos.find(alumno => {
        const rutAlumnoLimpio = window.RutValidator.limpiar(alumno.rut);
        return rutAlumnoLimpio === rutLimpio;
    });
    
    if (!alumnoEncontrado) {
        mostrarMensaje('❌ No se encontró ningún alumno con ese RUT', 'error');
        sugerenciasRut.innerHTML = `
            <div class="sugerencia-item no-resultados">
                No se encontró alumno con RUT: ${window.RutValidator.formatear(rutIngresado)}
            </div>
        `;
        sugerenciasRut.style.display = 'block';
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
    
    if (sugerenciasRut) {
        sugerenciasRut.style.display = 'none';
    }
    
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

// ===== CARGAR DATOS =====
// En anotaciones.js

async function cargarCursos() {
    try {
        const response = await fetch(`${API_URL}/cursos`);
        if (!response.ok) throw new Error('Error al cargar cursos');
        
        const cursos = await response.json();
        
        // Usamos Sets para evitar duplicados (ej: varios 1° Medios)
        const grados = new Set();
        const letras = new Set();
        
        cursos.forEach(curso => {
            if (curso.grado) grados.add(curso.grado);
            if (curso.nombre_curso) letras.add(curso.nombre_curso);
        });
        
        // Llenar select de Cursos (Grados)
        filtroCurso.innerHTML = '<option value="">Todos los cursos</option>';
        Array.from(grados).sort((a, b) => a - b).forEach(grado => {
            const option = document.createElement('option');
            option.value = grado;
            option.textContent = `${grado}° Medio`;
            filtroCurso.appendChild(option);
        });
        
        // Llenar select de Letras
        filtroLetra.innerHTML = '<option value="">Todas</option>';
        Array.from(letras).sort().forEach(letra => {
            const option = document.createElement('option');
            option.value = letra;
            option.textContent = letra;
            filtroLetra.appendChild(option);
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
        aplicarFiltrosAlumnos();
        inicializarBuscadorRut();
        
        // Llenar select del modal
        const modalAlumno = document.getElementById('modalAlumno');
        modalAlumno.innerHTML = '<option value="">Seleccionar alumno...</option>';
        todosLosAlumnos.forEach(alumno => {
            const option = document.createElement('option');
            option.value = alumno.id_alumno;
            option.textContent = `${alumno.nombres} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''} - ${alumno.rut}`;
            modalAlumno.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar alumnos:', error);
        mostrarError('Error al cargar la lista de alumnos');
    }
}

async function cargarDocentes() {
    try {
        const response = await fetch(`${API_URL}/docentes`);
        if (!response.ok) throw new Error('Error al cargar docentes');
        
        todosLosDocentes = await response.json();
        
        // Llenar select del modal
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
        
        // Si hay alumno seleccionado, cargar estadísticas
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

// En anotaciones.js

function aplicarFiltrosAlumnos() {
    console.log("🔄 Aplicando filtros...");
    
    // 1. Obtener valores y limpiarlos (trim elimina espacios accidentales)
    const gradoSeleccionado = filtroCurso.value;
    const letraSeleccionada = filtroLetra.value;
    
    console.log(`Filtros activos -> Grado: "${gradoSeleccionado}" | Letra: "${letraSeleccionada}"`);

    // 2. Filtrar la lista maestra
    let alumnosFiltrados = todosLosAlumnos.filter(alumno => {
        // A) Validar Grado
        // Convertimos ambos a String para comparar "1" con 1 sin problemas
        let coincideGrado = true;
        if (gradoSeleccionado !== "") {
            // Si el alumno no tiene grado, no coincide. Si tiene, comparamos texto.
            if (!alumno.grado) {
                coincideGrado = false;
            } else {
                coincideGrado = String(alumno.grado) === String(gradoSeleccionado);
            }
        }

        // B) Validar Letra (Curso)
        let coincideLetra = true;
        if (letraSeleccionada !== "") {
            if (!alumno.nombre_curso) {
                coincideLetra = false;
            } else {
                // Comparamos ignorando mayúsculas y espacios
                coincideLetra = String(alumno.nombre_curso).trim().toUpperCase() === String(letraSeleccionada).trim().toUpperCase();
            }
        }
        
        return coincideGrado && coincideLetra;
    });
    
    console.log(`Alumnos encontrados: ${alumnosFiltrados.length}`);

    // 3. Rellenar el select de Alumnos
    filtroAlumno.innerHTML = '<option value="">Todos los alumnos</option>';
    
    if (alumnosFiltrados.length > 0) {
        // Ordenar alfabéticamente
        alumnosFiltrados.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));

        alumnosFiltrados.forEach(alumno => {
            const option = document.createElement('option');
            option.value = alumno.id_alumno;
            
            // Texto informativo: Apellido Nombre (Curso)
            const textoCurso = alumno.grado ? ` (${alumno.grado}° ${alumno.nombre_curso})` : ' (Sin curso)';
            option.textContent = `${alumno.apellido_paterno} ${alumno.apellido_materno || ''}, ${alumno.nombres}${textoCurso}`;
            
            filtroAlumno.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.textContent = "❌ No hay alumnos con estos filtros";
        filtroAlumno.appendChild(option);
    }
    
    // 4. Actualizar el buscador de RUT auxiliar
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
        // Lógica corregida
        let tipoClass = 'informativa'; // Por defecto
        let icono = '📖';

        if (anotacion.tipo === 'Positiva') {
            tipoClass = 'positiva';
            icono = '✅';
        } else if (anotacion.tipo === 'Negativa') {
            tipoClass = 'negativa';
            icono = '❌';
        }

        
        // Si es Informativa, se queda con los valores por defecto

        const fecha = new Date(anotacion.fecha).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
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

// ===== MODALES =====
function abrirModalNueva() {
    // Si hay un alumno seleccionado, preseleccionarlo
    if (alumnoSeleccionado) {
        document.getElementById('modalAlumno').value = alumnoSeleccionado.id_alumno;
    }
    modalNuevaAnotacion.style.display = 'block';
}

function cerrarModalNueva() {
    modalNuevaAnotacion.style.display = 'none';
    document.getElementById('modalAlumno').value = '';
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
        document.getElementById('editAlumnoNombre').textContent = 
    `${anotacion.alumno_nombres} ${anotacion.alumno_apellido_paterno} ${anotacion.alumno_apellido_materno || ''}`;
        document.getElementById('editDocenteNombre').textContent = 
            `${anotacion.docente_nombre} ${anotacion.docente_apellido}`;
        document.getElementById('editFecha').textContent = 
            new Date(anotacion.fecha).toLocaleDateString('es-CL');
        document.getElementById('editTipo').value = anotacion.tipo;
        document.getElementById('editDescripcion').value = anotacion.descripcion;
        
        modalEditarAnotacion.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al cargar la anotación', 'error');
    }
}

function cerrarModalEditar() {
    modalEditarAnotacion.style.display = 'none';
}

async function guardarNuevaAnotacion() {
    const idAlumno = document.getElementById('modalAlumno').value;
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
            body: JSON.stringify({
                id_alumno: idAlumno,
                id_docente: idDocente,
                tipo: tipo,
                descripcion: descripcion
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar');
        }
        
        cerrarModalNueva();
        mostrarMensaje('✅ Anotación creada correctamente', 'success');
        cargarAnotaciones();
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al crear la anotación: ' + error.message, 'error');
    }
}

async function actualizarAnotacion() {
    const idAnotacion = document.getElementById('editIdAnotacion').value;
    const tipo = document.getElementById('editTipo').value;
    const descripcion = document.getElementById('editDescripcion').value.trim();
    
    if (!tipo || !descripcion) {
        mostrarMensaje('Por favor completa todos los campos', 'warning');
        return;
    }
    
    if (descripcion.length < 10) {
        mostrarMensaje('La descripción debe tener al menos 10 caracteres', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/anotaciones/${idAnotacion}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo: tipo,
                descripcion: descripcion
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar');
        }
        
        cerrarModalEditar();
        mostrarMensaje('✅ Anotación actualizada correctamente', 'success');
        cargarAnotaciones();
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al actualizar la anotación: ' + error.message, 'error');
    }
}

async function eliminarAnotacion() {
    if (!confirm('¿Estás seguro de eliminar esta anotación? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const idAnotacion = document.getElementById('editIdAnotacion').value;
    
    try {
        const response = await fetch(`${API_URL}/anotaciones/${idAnotacion}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar');
        }
        
        cerrarModalEditar();
        mostrarMensaje('✅ Anotación eliminada correctamente', 'success');
        cargarAnotaciones();
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al eliminar la anotación: ' + error.message, 'error');
    }
}

// ===== UTILIDADES =====
function limpiarFiltros() {
    filtroCurso.value = '';
    filtroLetra.value = '';
    filtroAlumno.value = '';
    filtroTipo.value = '';
    
    if (inputBuscarRut) {
        inputBuscarRut.value = '';
        inputBuscarRut.classList.remove('rut-valido', 'rut-invalido');
    }
    if (sugerenciasRut) {
        sugerenciasRut.style.display = 'none';
    }
    
    alumnoSeleccionado = null;
    infoAlumno.style.display = 'none';
    aplicarFiltrosAlumnos();
    cargarAnotaciones();
}

function mostrarCargando() {
    contenedorAnotaciones.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Cargando anotaciones...</p>
        </div>
    `;
}

function mostrarError(mensaje) {
    contenedorAnotaciones.innerHTML = `
        <div class="no-data" style="color: #dc3545;">
            <p>⚠️ ${mensaje}</p>
        </div>
    `;
}

function mostrarMensaje(mensaje, tipo = 'info') {
    const colores = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    const div = document.createElement('div');
    div.className = 'mensaje-toast';
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colores[tipo]};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        font-weight: 500;
    `;
    div.textContent = mensaje;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        window.location.href = '/logout';
    }
}

// Hacer accesible globalmente para onclick
window.abrirModalEditar = abrirModalEditar;