// Detecta automáticamente la URL según desde donde se acceda
const API_URL = `${window.location.origin}/api`;

let datosNotas = [];
let notaActualId = null;

// Elementos del DOM
const tablaBody = document.getElementById('tablaBody');
const tablaNotas = document.getElementById('tablaNotas');
const btnRecargar = document.getElementById('btnRecargar');
const btnNuevaEvaluacion = document.getElementById('btnNuevaEvaluacion');
const filtroCurso = document.getElementById('filtroCurso');
const filtroLetra = document.getElementById('filtroLetra');
const totalAlumnos = document.getElementById('totalAlumnos');
const modal = document.getElementById('modalEditar');
const filtroAsignatura = document.getElementById('filtroAsignatura');
const modalNuevaEval = document.getElementById('modalNuevaEvaluacion');
const modalEditarEval = document.getElementById('modalEditarEvaluacion');
const btnCerrarModal = document.querySelector('.close');
const btnCerrarModalEval = document.querySelector('.close-eval');
const btnCerrarModalEditEval = document.querySelector('.close-edit-eval');
const btnGuardarNota = document.getElementById('btnGuardarNota');
const btnCrearEvaluacion = document.getElementById('btnCrearEvaluacion');
const btnActualizarEvaluacion = document.getElementById('btnActualizarEvaluacion');
const btnEliminarEvaluacion = document.getElementById('btnEliminarEvaluacion');

let datosCompletosNotas = []; // Guardar todos los datos sin filtrar
let evaluacionActual = null; // Guardar datos de la evaluación siendo editada

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarCursos();
    cargarAsignaturas();
    cargarDocentes();
    cargarDatos();
    // Establecer fecha de hoy por defecto
    document.getElementById('inputFecha').valueAsDate = new Date();
});

btnRecargar.addEventListener('click', cargarDatos);
btnNuevaEvaluacion.addEventListener('click', abrirModalNuevaEvaluacion);

// Filtros
filtroCurso.addEventListener('change', aplicarFiltros);
filtroLetra.addEventListener('change', aplicarFiltros);
filtroAsignatura.addEventListener('change', aplicarFiltros);

// Modal editar nota
btnCerrarModal.addEventListener('click', cerrarModal);
window.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
    if (e.target === modalNuevaEval) cerrarModalNuevaEvaluacion();
    if (e.target === modalEditarEval) cerrarModalEditarEvaluacion();
});

btnGuardarNota.addEventListener('click', guardarNota);

// Modal nueva evaluación
btnCerrarModalEval.addEventListener('click', cerrarModalNuevaEvaluacion);
btnCrearEvaluacion.addEventListener('click', crearNuevaEvaluacion);

// Modal editar evaluación
btnCerrarModalEditEval.addEventListener('click', cerrarModalEditarEvaluacion);
btnActualizarEvaluacion.addEventListener('click', actualizarEvaluacion);
btnEliminarEvaluacion.addEventListener('click', eliminarEvaluacion);

// Función principal para cargar datos
async function cargarDatos() {
    try {
        mostrarCargando();
        
        const response = await fetch(`${API_URL}/notas`);
        if (!response.ok) throw new Error('Error al cargar datos');
        
        datosCompletosNotas = await response.json();
        aplicarFiltros();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('No se pudieron cargar los datos. Verifica que el servidor esté corriendo.');
    }
}
// (Función cargarCursos() existente...)

async function cargarAsignaturas() {
    try {
        const response = await fetch(`${API_URL}/asignaturas`);
        if (!response.ok) throw new Error('Error al cargar asignaturas');
        
        const asignaturas = await response.json();
        
        // Obtenemos los 3 selects
        const filtro = document.getElementById('filtroAsignatura');
        const inputCrear = document.getElementById('inputAsignatura');
        const inputEditar = document.getElementById('editAsignatura');
        
        // Opción por defecto para cada uno
        filtro.innerHTML = '<option value="">Todas las asignaturas</option>';
        inputCrear.innerHTML = '<option value="">Seleccionar...</option>';
        inputEditar.innerHTML = '<option value="">Seleccionar...</option>';
        
        // Llenamos los 3 selects con los datos de la BD
        asignaturas.forEach(asig => {
            // Opción para el filtro
            const op1 = document.createElement('option');
            op1.value = asig.nombre_asignatura;
            op1.textContent = asig.nombre_asignatura;
            filtro.appendChild(op1);

            // Opción para modal CREAR
            const op2 = document.createElement('option');
            op2.value = asig.nombre_asignatura;
            op2.textContent = asig.nombre_asignatura;
            inputCrear.appendChild(op2);

            // Opción para modal EDITAR
            const op3 = document.createElement('option');
            op3.value = asig.nombre_asignatura;
            op3.textContent = asig.nombre_asignatura;
            inputEditar.appendChild(op3);
            
        });
        
    } catch (error) {
        console.error('Error al cargar asignaturas:', error);
    }
}
// (Después de cargarAsignaturas() )

async function cargarDocentes() {
    try {
        const response = await fetch(`${API_URL}/docentes`);
        if (!response.ok) throw new Error('Error al cargar docentes');
        
        const docentes = await response.json();
        
        const inputDocente = document.getElementById('inputDocente');
        inputDocente.innerHTML = '<option value="">Seleccionar docente...</option>'; // Reiniciar
        
        docentes.forEach(docente => {
            const option = document.createElement('option');
            option.value = docente.id_docente;
            option.textContent = `${docente.nombre} ${docente.apellido}`;
            inputDocente.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error al cargar docentes:', error);
    }
}
async function cargarCursos() {
    try {
        const response = await fetch(`${API_URL}/cursos`);
        if (!response.ok) throw new Error('Error al cargar cursos');
        
        const cursos = await response.json();
        
        // Extraer grados únicos
        const grados = new Set();
        cursos.forEach(curso => {
            grados.add(curso.grado);
        });
        
        // Llenar select de curso (grado)
        //filtroCurso.innerHTML = '<option value="">Todos los cursos</option>';
        Array.from(grados).sort((a, b) => a - b).forEach(grado => {
            const option = document.createElement('option');
            option.value = grado;
            option.textContent = `${grado}° Medio`;
            
            filtroCurso.appendChild(option);
        });
        
        // Llenar select de letra con las letras disponibles
        const letras = new Set();
        cursos.forEach(curso => {
            letras.add(curso.nombre_curso);
        });
        
        filtroLetra.innerHTML = '<option value="">Todas</option>';
        Array.from(letras).sort().forEach(letra => {
            const option = document.createElement('option');
            option.value = letra;
            option.textContent = letra;
            filtroLetra.appendChild(option);
        });
        if (letras.has("A")) {
            filtroLetra.value = "A"; // Forzamos la selección
            aplicarFiltros(); // ¡Importante! Recargamos la tabla con el nuevo filtro
        }
        
        // Llenar select del modal de nueva evaluación
        const inputCurso = document.getElementById('inputCurso');
        inputCurso.innerHTML = '<option value="">Seleccionar curso...</option>';
        cursos.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso.id_curso;
            option.textContent = `${curso.grado}° Medio ${curso.nombre_curso}`;
            inputCurso.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error al cargar cursos:', error);
    }
}

function aplicarFiltros() {
    const gradoSeleccionado = filtroCurso.value;
    const letraSeleccionada = filtroLetra.value;
    const asignaturaSeleccionada = filtroAsignatura.value;
    
    // Filtrar datos
    let datosFiltrados = datosCompletosNotas;
    
    if (gradoSeleccionado || letraSeleccionada|| asignaturaSeleccionada) {
        datosFiltrados = datosCompletosNotas.filter(row => {
            let coincide = true;
            
            // Filtrar por grado
            if (gradoSeleccionado) {
                coincide = coincide && row.grado == gradoSeleccionado;
            }
            
            // Filtrar por letra
            if (letraSeleccionada) {
                coincide = coincide && row.nombre_curso === letraSeleccionada;
            }
            if (asignaturaSeleccionada) {
                // Esto filtra las filas de notas. 
                // Si una fila no es de la asignatura seleccionada, no se mostrará.
                coincide = coincide && row.nombre_asignatura === asignaturaSeleccionada;
            }
            
            return coincide;
        });
    }
    
    procesarYMostrarDatos(datosFiltrados);
}

// --- VARIABLES GLOBALES DE ORDENAMIENTO ---
let sortColumna = localStorage.getItem('notas_sortColumna') || 'nombre';
let sortDireccion = localStorage.getItem('notas_sortDireccion') || 'asc';

// Hacer setSort globalmente accesible para los onClick del HTML
window.setSort = function(columna) {
    if (sortColumna === columna) {
        sortDireccion = sortDireccion === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumna = columna;
        sortDireccion = 'asc';
    }
    localStorage.setItem('notas_sortColumna', sortColumna);
    localStorage.setItem('notas_sortDireccion', sortDireccion);
    aplicarFiltros(); // Re-procesa y muestra los datos aplicando el nuevo orden
};

// Función para guardar el orden manual al arrastrar y soltar
function guardarOrdenManual() {
    const filas = Array.from(document.querySelectorAll('#tablaBody tr[draggable="true"]'));
    const orden = filas.map(tr => tr.dataset.alumnoId);
    const key = `ordenManual_${filtroCurso.value}_${filtroLetra.value}_${filtroAsignatura.value}`;
    localStorage.setItem(key, JSON.stringify(orden));
    
    sortColumna = 'manual';
    localStorage.setItem('notas_sortColumna', 'manual');
}

function procesarYMostrarDatos(datos) {
    // Agrupar datos por alumno
    const alumnosPorId = {};
    const notasMap = new Map(); // Mapa para todas las evaluaciones únicas
    
    datos.forEach(row => {
        // Crear alumno si no existe
        if (!alumnosPorId[row.id_alumno]) {
            
            // === AQUÍ ESTÁ LA MAGIA DE LA NORMALIZACIÓN ===
            // Armamos el nombre verificando si tiene apellido materno o no (para que no diga "null")
            const apellidoMat = row.apellido_materno ? ` ${row.apellido_materno}` : '';
            const nombreCompleto = `${row.apellido_paterno}${apellidoMat}, ${row.nombres}`;
            
            alumnosPorId[row.id_alumno] = {
                id: row.id_alumno,
                nombre: nombreCompleto, // Quedará como: "Fuentealba Meneses, Gerson Benjasmin"
                rut: row.rut,
                curso: row.grado && row.nombre_curso ? `${row.grado}° ${row.nombre_curso}` : '-',
                notas: {}
            };
        }
        
        // Agregar evaluación (con o sin nota)
        if (row.evaluacion && row.id_nota) {
            // Crear key única por ASIGNATURA + EVALUACIÓN + FECHA
            const keyEvaluacion = `${row.nombre_asignatura}_${row.evaluacion}_${row.fecha}`;
            
            // Armamos el nombre del profesor con los datos del JOIN
            const nombreProfesor = (row.nombre_docente && row.apellido_docente) 
                ? `${row.nombre_docente} ${row.apellido_docente}` 
                : 'Profesor no asignado';

            // Guardamos la fecha formateada en una variable para que sea más fácil de leer
            const fechaFormateada = row.fecha ? new Date(row.fecha).toLocaleDateString('es-CL') : 'S/F';

            // Objeto infoNota
            const infoNota = {
                asignatura: row.nombre_asignatura || 'Sin asignatura',
                evaluacion: row.evaluacion,
                fecha: row.fecha ? new Date(row.fecha).toLocaleDateString('es-CL') : '',
                docente: nombreProfesor,
                fechaVisual: fechaFormateada,
                displayName: `${row.nombre_asignatura || 'Sin asignatura'} - ${row.evaluacion} (${fechaFormateada})`
            };
            
            // Guardar en el mapa global de evaluaciones (evita duplicados)
            if (!notasMap.has(keyEvaluacion)) {
                notasMap.set(keyEvaluacion, infoNota);
            }
            
            // Guardar la nota del alumno (puede ser NULL)
            if (!alumnosPorId[row.id_alumno].notas[keyEvaluacion] || 
                (row.nota !== null && alumnosPorId[row.id_alumno].notas[keyEvaluacion].nota === null)) {
                alumnosPorId[row.id_alumno].notas[keyEvaluacion] = {
                    nota: row.nota, // Puede ser NULL
                    fecha: row.fecha,
                    id_nota: row.id_nota,
                    evaluacion: row.evaluacion,
                    asignatura: row.nombre_asignatura,
                    nota_anterior: row.nota_anterior,   
                    modificado_por: row.modificado_por

                };
            }
        }
    });
    
    const listaAlumnos = Object.values(alumnosPorId);
    
    // Convertir el mapa a array y ordenar por fecha
    const listaNotas = Array.from(notasMap.entries())
        .sort((a, b) => {
            const fechaA = a[0].split('_')[2] || '';
            const fechaB = b[0].split('_')[2] || '';
            return new Date(fechaA) - new Date(fechaB);
        });

    // --- APLICAR ORDENAMIENTO A LOS ALUMNOS ---
    
    // 1. Pre-calcular promedios para todos
    listaAlumnos.forEach(alumno => {
        let sumaNotas = 0;
        let cantidadNotas = 0;
        listaNotas.forEach(([keyEvaluacion]) => {
            if (alumno.notas[keyEvaluacion] && alumno.notas[keyEvaluacion].nota !== null && alumno.notas[keyEvaluacion].nota !== undefined) {
                sumaNotas += parseFloat(alumno.notas[keyEvaluacion].nota);
                cantidadNotas++;
            }
        });
        alumno.promedio = cantidadNotas > 0 ? sumaNotas / cantidadNotas : 0;
    });

    // 2. Ordenar el array de alumnos
    listaAlumnos.sort((a, b) => {
        let valA, valB;
        if (sortColumna === 'manual') {
            const key = `ordenManual_${filtroCurso.value}_${filtroLetra.value}_${filtroAsignatura.value}`;
            const ordenStr = localStorage.getItem(key);
            if (ordenStr) {
                const orden = JSON.parse(ordenStr);
                const indexA = orden.indexOf(a.id.toString());
                const indexB = orden.indexOf(b.id.toString());
                
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
            }
            // Fallback si no están en el orden manual o no hay orden guardado
            valA = (a.nombre || '').toLowerCase();
            valB = (b.nombre || '').toLowerCase();
            if (valA < valB) return -1;
            if (valA > valB) return 1;
            return 0;
        } else if (sortColumna === 'nombre') {
            valA = (a.nombre || '').toLowerCase();
            valB = (b.nombre || '').toLowerCase();
        } else if (sortColumna === 'rut') {
            valA = (a.rut || '').toLowerCase();
            valB = (b.rut || '').toLowerCase();
        } else if (sortColumna === 'curso') {
            valA = (a.curso || '').toLowerCase();
            valB = (b.curso || '').toLowerCase();
        } else if (sortColumna === 'promedio') {
            valA = a.promedio;
            valB = b.promedio;
        } else {
            // Asumimos que es una evaluación (keyEvaluacion)
            valA = (a.notas[sortColumna] && a.notas[sortColumna].nota !== null && a.notas[sortColumna].nota !== undefined) ? parseFloat(a.notas[sortColumna].nota) : -1;
            valB = (b.notas[sortColumna] && b.notas[sortColumna].nota !== null && b.notas[sortColumna].nota !== undefined) ? parseFloat(b.notas[sortColumna].nota) : -1;
        }
        
        if (valA < valB) return sortDireccion === 'asc' ? -1 : 1;
        if (valA > valB) return sortDireccion === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Actualizar info
    totalAlumnos.textContent = `Total de alumnos: ${listaAlumnos.length} | Evaluaciones: ${listaNotas.length}`;
    
    // Generar tabla
    generarEncabezados(listaNotas);
    generarFilas(listaAlumnos, listaNotas);
}

function generarEncabezados(notasArray) {
    const thead = tablaNotas.querySelector('thead tr');
    
    // Actualizar indicadores fijos
    const elemRut = document.getElementById('sort-rut');
    const elemNombre = document.getElementById('sort-nombre');
    const elemCurso = document.getElementById('sort-curso');
    
    if (elemRut) elemRut.textContent = sortColumna === 'rut' ? (sortDireccion === 'asc' ? ' 🔼' : ' 🔽') : '';
    if (elemNombre) elemNombre.textContent = sortColumna === 'nombre' ? (sortDireccion === 'asc' ? ' 🔼' : ' 🔽') : '';
    if (elemCurso) elemCurso.textContent = sortColumna === 'curso' ? (sortDireccion === 'asc' ? ' 🔼' : ' 🔽') : '';

    // Limpiar columnas dinámicas anteriores
    while (thead.children.length > 3) {
        thead.removeChild(thead.lastChild);
    }
    
    // Agregar columnas de notas individuales
    notasArray.forEach(([keyNota, infoNota]) => {
        const th = document.createElement('th');
        th.innerHTML = `
    <div style="line-height: 1.2;">
        <strong>${infoNota.asignatura}</strong><br>
        <span style="font-size: 0.9em; opacity: 0.9;">${infoNota.evaluacion}</span><br>
        <span style="font-size: 0.75em; color: #ffd54f;">👨‍🏫 ${infoNota.docente}</span>
        <span class="sort-indicator"></span>
    </div>
`;
        th.className = 'eval-col editable-header sortable';
        th.title = 'Clic para ordenar. Doble clic para editar/eliminar esta evaluación';
        th.style.cursor = 'pointer';
        
        // Guardar datos de la evaluación en el elemento
        th.dataset.asignatura = infoNota.asignatura;
        th.dataset.evaluacion = infoNota.evaluacion;
        th.dataset.fecha = keyNota.split('_')[2]; // Fecha del key
        
        // Evento de clic en cabecera para ordenar
        th.addEventListener('click', (e) => {
            if (e.detail === 1) { // Evitar doble ejecución en dblclick
                setTimeout(() => {
                    setSort(keyNota);
                }, 200);
            }
        });

        // Evento de doble clic en cabecera para editar
        th.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            abrirModalEditarEvaluacion(th);
        });
        
        // Actualizar el indicador de ordenamiento
        if (sortColumna === keyNota) {
            th.querySelector('.sort-indicator').textContent = sortDireccion === 'asc' ? ' 🔼' : ' 🔽';
        }

        thead.appendChild(th);
    });
    
    // Agregar columna de promedio
    const thPromedio = document.createElement('th');
    thPromedio.innerHTML = `Promedio <span class="sort-indicator"></span>`;
    thPromedio.className = 'promedio-col sortable';
    thPromedio.style.cursor = 'pointer';
    thPromedio.addEventListener('click', () => setSort('promedio'));
    if (sortColumna === 'promedio') {
        thPromedio.querySelector('.sort-indicator').textContent = sortDireccion === 'asc' ? ' 🔼' : ' 🔽';
    }
    thead.appendChild(thPromedio);
}

function generarFilas(alumnos, notasArray) {
    tablaBody.innerHTML = '';
    
    if (alumnos.length === 0) {
        tablaBody.innerHTML = `
            <tr>
                <td colspan="${notasArray.length + 4}" class="no-data">
                    No hay alumnos registrados
                </td>
            </tr>
        `;
        return;
    }
    
    alumnos.forEach(alumno => {
        const tr = document.createElement('tr');
        tr.draggable = true;
        tr.dataset.alumnoId = alumno.id;
        
        // --- EVENTOS DRAG AND DROP ---
        tr.addEventListener('dragstart', (e) => {
            tr.classList.add('dragging');
            setTimeout(() => {
                tr.style.opacity = '0.5';
            }, 0);
        });

        tr.addEventListener('dragend', () => {
            tr.classList.remove('dragging');
            tr.style.opacity = '1';
            document.querySelectorAll('#tablaBody tr').forEach(fila => {
                fila.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });

        tr.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            const draggingRow = document.querySelector('.dragging');
            if (!draggingRow || draggingRow === tr) return;

            const rect = tr.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            
            if (offsetY < rect.height / 2) {
                tr.classList.add('drag-over-top');
                tr.classList.remove('drag-over-bottom');
            } else {
                tr.classList.add('drag-over-bottom');
                tr.classList.remove('drag-over-top');
            }
        });

        tr.addEventListener('dragleave', () => {
            tr.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        tr.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingRow = document.querySelector('.dragging');
            if (!draggingRow || draggingRow === tr) return;
            
            tr.classList.remove('drag-over-top', 'drag-over-bottom');

            const rect = tr.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            
            if (offsetY < rect.height / 2) {
                tr.parentNode.insertBefore(draggingRow, tr);
            } else {
                tr.parentNode.insertBefore(draggingRow, tr.nextSibling);
            }
            
            // Limpiar indicadores de ordenamiento automático si el usuario ordena manual
            const elemRut = document.getElementById('sort-rut');
            const elemNombre = document.getElementById('sort-nombre');
            const elemCurso = document.getElementById('sort-curso');
            if (elemRut) elemRut.textContent = '';
            if (elemNombre) elemNombre.textContent = '';
            if (elemCurso) elemCurso.textContent = '';
            document.querySelectorAll('.sort-indicator').forEach(ind => ind.textContent = '');
            guardarOrdenManual();
        });
        
        // Columnas fijas
        tr.innerHTML = `
            <td class="sticky-col rut-col">${alumno.rut}</td>
            <td class="sticky-col nombre-col"><strong>${alumno.nombre}</strong></td>
            <td class="sticky-col curso-col">${alumno.curso || '-'}</td>
        `;
        
        // Columnas de notas individuales
        let sumaNotas = 0;
        let cantidadNotas = 0;
        
        notasArray.forEach(([keyEvaluacion, infoNota]) => {
            const td = document.createElement('td');
            td.className = 'nota-cell editable';
            
            if (alumno.notas[keyEvaluacion]) {
                const notaData = alumno.notas[keyEvaluacion];
                
                // Verificar si tiene nota o es NULL
                // Verificar si tiene nota o es NULL
                if (notaData.nota !== null && notaData.nota !== undefined) {
                    const nota = parseFloat(notaData.nota);
                    
                    // 1. Armamos la nota normal
                    let htmlContenido = `<span class="nota ${getColorNota(nota)}">${nota.toFixed(1)}</span>`;
                    
                    // 2. Si es ADMIN y hay historial guardado, le ponemos el ojito
                    if (typeof ROL_USUARIO !== 'undefined' && ROL_USUARIO === 'admin' && notaData.nota_anterior !== null) {
                        htmlContenido += `<span class="icono-historial" 
                                            onclick="verHistorial(event, '${notaData.nota_anterior}', '${notaData.modificado_por}')" 
                                            style="cursor: pointer; font-size: 14px; margin-left: 6px; opacity: 0.8;" 
                                            `;
                    }
                    
                    td.innerHTML = htmlContenido;
                    td.dataset.idNota = notaData.id_nota;
                    td.dataset.alumno = alumno.nombre;
                    td.dataset.evaluacion = `${notaData.asignatura} - ${notaData.evaluacion}`;
                    td.dataset.notaActual = nota;
                    td.dataset.tieneNota = 'true';
                    
                    sumaNotas += nota;
                    cantidadNotas++;
                } else { 
                    // Nota NULL - celda vacía pero editable
                    td.innerHTML = '<span class="sin-nota pendiente">Pendiente</span>';
                    td.dataset.idNota = notaData.id_nota;
                    td.dataset.alumno = alumno.nombre;
                    td.dataset.evaluacion = `${notaData.asignatura} - ${notaData.evaluacion}`;
                    td.dataset.tieneNota = 'false';
                }
            } else {
                // No existe registro de nota para este alumno
                td.innerHTML = '<span class="sin-nota">-</span>';
                td.dataset.alumno = alumno.nombre;
                td.dataset.evaluacion = `${infoNota.asignatura} - ${infoNota.evaluacion}`;
                td.dataset.tieneNota = 'false';
            }
            
            td.title = 'Doble clic para editar';
            
            // Evento de doble clic para editar
            td.addEventListener('dblclick', () => hacerCeldaEditable(td));
            
            tr.appendChild(td);
        });
        
        // Columna de promedio
        const tdPromedio = document.createElement('td');
        tdPromedio.className = 'promedio-cell';
        
        if (cantidadNotas > 0) {
            const promedio = sumaNotas / cantidadNotas;
            tdPromedio.innerHTML = `<strong class="nota ${getColorNota(promedio)}">${promedio.toFixed(1)}</strong>`;
        } else {
            tdPromedio.innerHTML = '<span class="sin-nota">-</span>';
        }
        
        tr.appendChild(tdPromedio);
        tablaBody.appendChild(tr);
    });
}

function hacerCeldaEditable(celda) {
    // Si ya está en modo edición, no hacer nada
    if (celda.querySelector('input')) return;
    
    const valorActual = celda.dataset.notaActual || '';
    const contenidoOriginal = celda.innerHTML;
    
    // Crear input para edición
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1.0';
    input.max = '7.0';
    input.step = '0.1';
    input.value = valorActual;
    input.className = 'input-nota-inline';
    input.placeholder = '1.0 - 7.0';
    
    // Reemplazar contenido con input
    celda.innerHTML = '';
    celda.appendChild(input);
    input.focus();
    input.select();
    
    // --- AQUÍ ESTÁ EL CANDADO QUE FALTABA ---
    let guardando = false; 
    
    // Función para guardar
    const guardarNota = async () => {
        if (guardando) return; // Si ya está guardando, bloqueamos el segundo intento
        guardando = true;      // Cerramos el candado
        
        const nuevaNota = parseFloat(input.value);
        
        // Validar nota
        if (!input.value) {
            // Si está vacío, restaurar contenido original
            celda.innerHTML = contenidoOriginal;
            return;
        }
        
        if (isNaN(nuevaNota) || nuevaNota < 1.0 || nuevaNota > 7.0) {
            alert('Por favor ingresa una nota válida entre 1.0 y 7.0');
            celda.innerHTML = contenidoOriginal;
            return;
        }
        
        // Mostrar loading
        celda.innerHTML = '<span class="loading-inline">💾</span>';
        
        try {
            const idNota = celda.dataset.idNota;
            
            // Actualizar nota (sea NULL o no)
            const response = await fetch(`${API_URL}/notas/${idNota}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nota: nuevaNota })
            });
            
            if (!response.ok) throw new Error('Error al actualizar');
            
            // Actualizar celda con nuevo valor
            celda.innerHTML = `<span class="nota ${getColorNota(nuevaNota)}">${nuevaNota.toFixed(1)}</span>`;
            celda.dataset.notaActual = nuevaNota;
            celda.dataset.tieneNota = 'true';
            
            // Mostrar feedback visual
            celda.classList.add('actualizada');
            setTimeout(() => celda.classList.remove('actualizada'), 1000);
            
            // Recargar para actualizar promedio
            setTimeout(() => cargarDatos(), 500);
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar la nota');
            celda.innerHTML = contenidoOriginal;
        }
    };
    
    // Guardar con Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur(); // Simula un clic afuera para que guarde 1 sola vez sin errores
        } else if (e.key === 'Escape') {
            // Cancelar con ESC
            guardando = true; // Bloquea el intento de guardado automático
            celda.innerHTML = contenidoOriginal;
        }
    });
    
    // Guardar al perder foco
    input.addEventListener('blur', guardarNota);
}

function getColorNota(nota) {
    if (nota >= 5.5) return 'nota-alta';
    if (nota >= 4.0) return 'nota-media';
    return 'nota-baja';
}

function abrirModalEditar(celda) {
    notaActualId = celda.dataset.idNota;
    document.getElementById('modalAlumno').textContent = celda.dataset.alumno;
    document.getElementById('modalEvaluacion').textContent = celda.dataset.evaluacion;
    document.getElementById('inputNota').value = celda.dataset.notaActual;
    modal.style.display = 'block';
}

function cerrarModal() {
    modal.style.display = 'none';
    notaActualId = null;
}

async function guardarNota() {
    const nuevaNota = parseFloat(document.getElementById('inputNota').value);
    
    if (!nuevaNota || nuevaNota < 1.0 || nuevaNota > 7.0) {
        alert('Por favor ingresa una nota válida entre 1.0 y 7.0');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/notas/${notaActualId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nota: nuevaNota })
        });
        
        if (!response.ok) throw new Error('Error al actualizar');
        
        cerrarModal();
        cargarDatos(); // Recargar datos
        mostrarMensaje('Nota actualizada correctamente');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la nota');
    }
}

function mostrarCargando() {
    tablaBody.innerHTML = `
        <tr>
            <td colspan="20" class="loading">
                <div class="spinner"></div>
                Cargando datos...
            </td>
        </tr>
    `;
}

function mostrarError(mensaje) {
    tablaBody.innerHTML = `
        <tr>
            <td colspan="20" class="error">
                ⚠️ ${mensaje}
            </td>
        </tr>
    `;
}

function mostrarMensaje(mensaje) {
    const div = document.createElement('div');
    div.className = 'mensaje-exito';
    div.textContent = `✓ ${mensaje}`;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.remove();
    }, 3000);
}

function abrirModalNuevaEvaluacion() {
    modalNuevaEval.style.display = 'block';
}

function cerrarModalNuevaEvaluacion() {
    modalNuevaEval.style.display = 'none';
    // Limpiar campos
    document.getElementById('inputAsignatura').value = '';
    document.getElementById('inputTipoEvaluacion').value = '';
    document.getElementById('inputFecha').valueAsDate = new Date();
    document.getElementById('inputCurso').value = ''; // <-- Limpiar curso
    document.getElementById('inputDocente').value = ''; // <
}       

function abrirModalEditarEvaluacion(cabecera) {
    evaluacionActual = {
        asignatura: cabecera.dataset.asignatura,
        evaluacion: cabecera.dataset.evaluacion,
        fecha: cabecera.dataset.fecha
    };
    
    // Llenar los inputs con los valores actuales
    document.getElementById('editAsignatura').value = evaluacionActual.asignatura;
    document.getElementById('editTipoEvaluacion').value = evaluacionActual.evaluacion;
    document.getElementById('editFecha').value = evaluacionActual.fecha;
    
    modalEditarEval.style.display = 'block';
}

function cerrarModalEditarEvaluacion() {
    modalEditarEval.style.display = 'none';
    evaluacionActual = null;
}

async function actualizarEvaluacion() {
    if (!evaluacionActual) return;
    
    const asignaturaNueva = document.getElementById('editAsignatura').value;
    const tipoNuevo = document.getElementById('editTipoEvaluacion').value.trim();
    const fechaNueva = document.getElementById('editFecha').value;
    
    // Validaciones
    if (!asignaturaNueva || !tipoNuevo || !fechaNueva) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    // Verificar si hubo cambios
    if (asignaturaNueva === evaluacionActual.asignatura && 
        tipoNuevo === evaluacionActual.evaluacion && 
        fechaNueva === evaluacionActual.fecha) {
        alert('No se detectaron cambios');
        return;
    }
    
    if (!confirm(`¿Actualizar esta evaluación?\n\nEsto afectará a TODOS los alumnos.`)) {
        return;
    }
    
    try {
        btnActualizarEvaluacion.disabled = true;
        btnActualizarEvaluacion.textContent = 'Guardando...';
        
        const response = await fetch(`${API_URL}/evaluaciones`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                asignatura_vieja: evaluacionActual.asignatura,
                evaluacion_vieja: evaluacionActual.evaluacion,
                fecha_vieja: evaluacionActual.fecha,
                asignatura_nueva: asignaturaNueva,
                evaluacion_nueva: tipoNuevo,
                fecha_nueva: fechaNueva
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar evaluación');
        }
        
        const resultado = await response.json();
        
        cerrarModalEditarEvaluacion();
        mostrarMensaje(`Evaluación actualizada: ${resultado.notas_actualizadas} notas actualizadas`);
        
        // Recargar datos
        setTimeout(() => cargarDatos(), 500);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la evaluación: ' + error.message);
    } finally {
        btnActualizarEvaluacion.disabled = false;
        btnActualizarEvaluacion.textContent = '💾 Guardar Cambios';
    }
}

async function eliminarEvaluacion() {
    if (!evaluacionActual) {
        console.error('No hay evaluación actual');
        return;
    }
    
    console.log('Datos a eliminar:', evaluacionActual);
    
    const confirmacion = confirm(
        `¿Estás seguro de eliminar la evaluación "${evaluacionActual.asignatura} - ${evaluacionActual.evaluacion}"?\n\n` +
        `Esto eliminará TODAS las notas de esta evaluación para TODOS los alumnos.\n\n` +
        `Esta acción NO se puede deshacer.`
    );
    
    if (!confirmacion) return;
    
    try {
        btnEliminarEvaluacion.disabled = true;
        btnEliminarEvaluacion.textContent = 'Eliminando...';
        
        console.log('Enviando DELETE request...');
        
        const response = await fetch(`${API_URL}/evaluaciones`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                asignatura: evaluacionActual.asignatura,
                evaluacion: evaluacionActual.evaluacion,
                fecha: evaluacionActual.fecha
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Error del servidor:', error);
            throw new Error(error.error || 'Error al eliminar evaluación');
        }
        
        const resultado = await response.json();
        console.log('Resultado:', resultado);
        
        cerrarModalEditarEvaluacion();
        mostrarMensaje(`Evaluación eliminada: ${resultado.notas_eliminadas} notas eliminadas`);
        
        // Recargar datos
        setTimeout(() => cargarDatos(), 500);
        
    } catch (error) {
        console.error('Error completo:', error);
        alert('Error al eliminar la evaluación: ' + error.message);
    } finally {
        btnEliminarEvaluacion.disabled = false;
        btnEliminarEvaluacion.textContent = '🗑️ Eliminar Evaluación';
    }
}

async function crearNuevaEvaluacion() {
    const asignatura = document.getElementById('inputAsignatura').value;
    const tipoEvaluacion = document.getElementById('inputTipoEvaluacion').value.trim();
    const fecha = document.getElementById('inputFecha').value;
    const idCurso = document.getElementById('inputCurso').value;
    const idDocente = document.getElementById('inputDocente').value;
    // Validaciones
    if (!asignatura) {
        alert('Por favor selecciona una asignatura');
        return;
    }
    
    if (!tipoEvaluacion) {
        alert('Por favor ingresa el tipo de evaluación');
        return;
    }
    if (!idCurso) { // <-- AÑADIR (buena práctica)
        alert('Por favor selecciona un curso');
        return;
    }
    if (!idDocente) { // <-- AÑADIR
        alert('Por favor selecciona un docente');
        return;
    }
    if (!fecha) {
        alert('Por favor selecciona una fecha');
        return;
    }
    
    // Confirmar
    if (!confirm(`¿Crear evaluación "${asignatura} - ${tipoEvaluacion}" para todos los alumnos?`)) {
        return;
    }
    
    try {
        // Deshabilitar botón
        btnCrearEvaluacion.disabled = true;
        btnCrearEvaluacion.textContent = 'Creando...';
        
        const response = await fetch(`${API_URL}/evaluaciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_asignatura: asignatura,
                evaluacion: tipoEvaluacion,
                fecha: fecha,
                id_curso: idCurso,
                id_docente: idDocente
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear evaluación');
        }
        
        const resultado = await response.json();
        
        cerrarModalNuevaEvaluacion();
        mostrarMensaje(`Evaluación creada: ${resultado.alumnos_afectados} alumnos`);
        
        // Recargar datos
        setTimeout(() => cargarDatos(), 500);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al crear la evaluación: ' + error.message);
    } finally {
        btnCrearEvaluacion.disabled = false;
        btnCrearEvaluacion.textContent = 'Crear Evaluación';
    }
}
// Función para que los administradores vean el historial de una nota
function verHistorial(event, notaAnterior, modificadoPor) {
    event.stopPropagation(); // Evita que se active el "doble clic" para editar al presionar el ojito
    
    const notaLimpia = parseFloat(notaAnterior).toFixed(1);
    
    // Usamos el Toast de Materialize para una alerta elegante y rápida
    M.toast({
        html: `<div style="line-height: 1.5;">
                 <span>🕒 <b>Nota anterior:</b> ${notaLimpia}</span><br>
                 <span style="color: #ffd54f;">👤 <b>Por:</b> ${modificadoPor}</span>
               </div>`, 
        classes: 'purple darken-3 rounded', 
        displayLength: 5000
    });
}