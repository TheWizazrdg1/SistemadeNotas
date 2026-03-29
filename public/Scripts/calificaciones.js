const API_URL = `${window.location.origin}/api`;

// Elementos del DOM
const filtroCurso = document.getElementById('filtroCurso');
const filtroLetra = document.getElementById('filtroLetra');
const filtroAlumno = document.getElementById('filtroAlumno');
const filtroAsignatura = document.getElementById('filtroAsignatura');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const btnDescargarPDF = document.getElementById('btnDescargarPDF');
const infoAlumno = document.getElementById('infoAlumno');
const contenedorCalificaciones = document.getElementById('contenedorCalificaciones');

const inputBuscarRut = document.getElementById('inputBuscarRut');
const btnBuscarRut = document.getElementById('btnBuscarRut');
const sugerenciasRut = document.getElementById('sugerenciasRut');

// Info del alumno
const nombreAlumno = document.getElementById('nombreAlumno');
const rutAlumno = document.getElementById('rutAlumno');
const cursoAlumno = document.getElementById('cursoAlumno');
const promedioGeneral = document.getElementById('promedioGeneral');

// Variables globales
let datosActuales = null;
let todosLosAlumnos = [];
let todasLasAsignaturas = [];

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarCursos();
    cargarAsignaturas();
    cargarAlumnos();
});

// Event Listeners
filtroCurso.addEventListener('change', aplicarFiltrosAlumnos);
filtroLetra.addEventListener('change', aplicarFiltrosAlumnos);
filtroAlumno.addEventListener('change', cargarCalificaciones);
filtroAsignatura.addEventListener('change', () => {
    if (datosActuales) {
        mostrarCalificaciones(datosActuales);
    }
});
btnLimpiar.addEventListener('click', limpiarFiltros);
btnCerrarSesion.addEventListener('click', cerrarSesion);
btnDescargarPDF.addEventListener('click', descargarPDF);

// Cargar cursos
async function cargarCursos() {
    try {
        const response = await fetch(`${API_URL}/cursos`);
        if (!response.ok) throw new Error('Error al cargar cursos');
        
        const cursos = await response.json();
        
        const grados = new Set();
        const letras = new Set();
        
        cursos.forEach(curso => {
            grados.add(curso.grado);
            letras.add(curso.nombre_curso);
        });
        
        filtroCurso.innerHTML = '<option value="">Todos los cursos</option>';
        Array.from(grados).sort((a, b) => a - b).forEach(grado => {
            const option = document.createElement('option');
            option.value = grado;
            option.textContent = `${grado}° Medio`;
            filtroCurso.appendChild(option);
        });
        
        filtroLetra.innerHTML = '<option value="">Todas</option>';
        Array.from(letras).sort().forEach(letra => {
            const option = document.createElement('option');
            option.value = letra;
            option.textContent = letra;
            filtroLetra.appendChild(option);
        });
        M.FormSelect.init(document.querySelectorAll('select'));
        
    } catch (error) {
        console.error('Error al cargar cursos:', error);
    }
}

// Cargar asignaturas
async function cargarAsignaturas() {
    try {
        const response = await fetch(`${API_URL}/asignaturas`);
        if (!response.ok) throw new Error('Error al cargar asignaturas');
        
        todasLasAsignaturas = await response.json();
        
        filtroAsignatura.innerHTML = '<option value="">Todas las asignaturas</option>';
        todasLasAsignaturas.forEach(asig => {
            const option = document.createElement('option');
            option.value = asig.nombre_asignatura;
            option.textContent = asig.nombre_asignatura;
            filtroAsignatura.appendChild(option);
        });
        M.FormSelect.init(document.querySelectorAll('select'));
        
    } catch (error) {
        console.error('Error al cargar asignaturas:', error);
    }
}

// Cargar lista de alumnos
async function cargarAlumnos() {
    try {
        const response = await fetch(`${API_URL}/alumnos`);
        if (!response.ok) throw new Error('Error al cargar alumnos');
        
        todosLosAlumnos = await response.json();
        aplicarFiltrosAlumnos();
        
        if (window.RutValidator && window.RutValidator.BuscadorRut) {
            new window.RutValidator.BuscadorRut({
                inputElement: inputBuscarRut,
                sugerenciasElement: sugerenciasRut,
                alumnos: todosLosAlumnos,
                onSelect: (alumno) => {
                    seleccionarAlumnoDirecto(alumno);
                }
            });
            M.FormSelect.init(document.querySelectorAll('select'));
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar la lista de alumnos');
    }
}

if (btnBuscarRut) {
    btnBuscarRut.addEventListener('click', () => {
        const rutIngresado = inputBuscarRut.value;
        const rutLimpio = window.RutValidator.limpiar(rutIngresado);
        
        if (rutLimpio.length < 2) {
            alert('Por favor ingrese un RUT válido');
            return;
        }

        const alumnoEncontrado = todosLosAlumnos.find(a => 
            window.RutValidator.limpiar(a.rut) === rutLimpio
        );

        if (alumnoEncontrado) {
            seleccionarAlumnoDirecto(alumnoEncontrado);
        } else {
            alert('Alumno no encontrado con ese RUT');
        }
    });
}

function seleccionarAlumnoDirecto(alumno) {
    filtroCurso.value = '';
    filtroLetra.value = '';
    
    filtroAlumno.innerHTML = '<option value="">Seleccionar alumno...</option>';
    todosLosAlumnos.forEach(a => {
        const option = document.createElement('option');
        option.value = a.id_alumno;
        option.textContent = `${a.apellido_paterno} ${a.apellido_materno || ''}, ${a.nombres}`;
        filtroAlumno.appendChild(option);
    });

    filtroAlumno.value = alumno.id_alumno;
    cargarCalificaciones();
}

function aplicarFiltrosAlumnos() {
    const gradoSeleccionado = filtroCurso.value;
    const letraSeleccionada = filtroLetra.value;
    
    let alumnosFiltrados = todosLosAlumnos;
    
    if (gradoSeleccionado) {
        alumnosFiltrados = alumnosFiltrados.filter(alumno => 
            alumno.grado == gradoSeleccionado
        );
    }
    
    if (letraSeleccionada) {
        alumnosFiltrados = alumnosFiltrados.filter(alumno => 
            alumno.nombre_curso === letraSeleccionada
        );
    }
    
    filtroAlumno.innerHTML = '<option value="">Seleccionar alumno...</option>';
    
    alumnosFiltrados.forEach(alumno => {
        const option = document.createElement('option');
        option.value = alumno.id_alumno;
        option.textContent = `${alumno.apellido_paterno} ${alumno.apellido_materno || ''}, ${alumno.nombres}${alumno.grado ? ` - ${alumno.grado}° ${alumno.nombre_curso}` : ''}`;
        filtroAlumno.appendChild(option);
    });
    
    const alumnoActual = filtroAlumno.value;
    if (alumnoActual && !alumnosFiltrados.find(a => a.id_alumno == alumnoActual)) {
        filtroAlumno.value = '';
        limpiarVista();
    }
}

async function cargarCalificaciones() {
    const idAlumno = filtroAlumno.value;
    
    if (!idAlumno) {
        limpiarVista();
        return;
    }
    
    try {
        mostrarCargando();
        
        const response = await fetch(`${API_URL}/calificaciones/${idAlumno}`);
        if (!response.ok) throw new Error('Error al cargar calificaciones');
        
        const datos = await response.json();
        datosActuales = datos;
        
        if (datos.length === 0) {
            mostrarSinDatos();
            return;
        }
        
        mostrarCalificaciones(datos);
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar las calificaciones');
    }
}

function mostrarCalificaciones(datos) {
    if (!datos || datos.length === 0) return;
    
    const primerDato = datos[0];
    nombreAlumno.textContent = `${primerDato.nombres} ${primerDato.apellido_paterno} ${primerDato.apellido_materno || ''}`;
    rutAlumno.textContent = primerDato.rut;
    
    // --- INCORPORACIÓN DEL PROFESOR JEFE EN LA VISTA ---
    const nombreProfeJefe = primerDato.profe_jefe_nombre ? `${primerDato.profe_jefe_nombre} ${primerDato.profe_jefe_apellido}` : 'No asignado';
    cursoAlumno.textContent = `${primerDato.grado}° ${primerDato.nombre_curso} | Prof. Jefe: ${nombreProfeJefe}`;
    
    infoAlumno.style.display = 'block';
    
    const asignaturaFiltro = filtroAsignatura.value;
    const asignaturas = {};
    
    datos.forEach(nota => {
        if (asignaturaFiltro && nota.nombre_asignatura !== asignaturaFiltro) {
            return;
        }
        
        if (!asignaturas[nota.nombre_asignatura]) {
            asignaturas[nota.nombre_asignatura] = {
                notas: [],
                docente: `${nota.docente_nombre} ${nota.docente_apellido}`
            };
        }
        
        asignaturas[nota.nombre_asignatura].notas.push(nota);
    });
    
    if (Object.keys(asignaturas).length === 0) {
        contenedorCalificaciones.innerHTML = `
            <div class="no-data">
                <p>📋 No hay calificaciones para los filtros seleccionados</p>
            </div>
        `;
        btnDescargarPDF.disabled = false;
        return;
    }
    
    let sumaTotal = 0;
    let cantidadTotal = 0;
    let html = '';
    
    Object.keys(asignaturas).sort().forEach(nombreAsig => {
        const asig = asignaturas[nombreAsig];
        
        let suma = 0;
        let cantidad = 0;
        
        asig.notas.forEach(nota => {
            if (nota.nota !== null) {
                suma += parseFloat(nota.nota);
                cantidad++;
            }
        });
        
        let promedio = cantidad > 0 ? (suma / cantidad).toFixed(1) : null;
        if (promedio === '3.9') promedio = '4.0'; 
        
        if (promedio !== null) {
            sumaTotal += parseFloat(promedio);
            cantidadTotal++;
        }
        
        html += `
            <div class="asignatura-card">
                <div class="asignatura-header">
                    <h3>
                        📚 ${nombreAsig}
                        <span style="font-size: 12px; font-weight: normal; opacity: 0.9;">
                            (Prof. ${asig.docente})
                        </span>
                    </h3>
                    ${promedio !== null ? 
                        `<span class="promedio-asignatura ${getColorNota(promedio)}">
                            Promedio: ${promedio}
                        </span>` : 
                        `<span class="promedio-asignatura nota-pendiente">Sin notas</span>`
                    }
                </div>
                <div class="notas-lista">
                    ${asig.notas.length > 0 ? 
                        `<div class="notas-grid">
                            ${asig.notas.map(nota => `
                                <div class="nota-item">
                                    <h4>${nota.evaluacion}</h4>
                                    <div class="nota-valor ${nota.nota !== null ? getColorNota(nota.nota) : 'nota-pendiente'}">
                                        ${nota.nota !== null ? parseFloat(nota.nota).toFixed(1) : 'Pendiente'}
                                    </div>
                                    <div class="nota-fecha">
                                        📅 ${new Date(nota.fecha).toLocaleDateString('es-CL')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>` : 
                        '<div class="sin-notas">No hay evaluaciones registradas</div>'
                    }
                </div>
            </div>
        `;
    });
    
    contenedorCalificaciones.innerHTML = html;
    
    if (cantidadTotal > 0) {
        let promedioFinal = (sumaTotal / cantidadTotal).toFixed(1);
        if (promedioFinal === '3.9') promedioFinal = '4.0'; 
        promedioGeneral.textContent = promedioFinal;
        promedioGeneral.className = `promedio-badge ${getColorNota(promedioFinal)}`;
    } else {
        promedioGeneral.textContent = '-';
        promedioGeneral.className = 'promedio-badge';
    }
    
    btnDescargarPDF.disabled = false;
}

async function descargarPDF() {
    if (!datosActuales || datosActuales.length === 0) {
        alert('No hay datos para descargar');
        return;
    }
    
    try {
        btnDescargarPDF.disabled = true;
        btnDescargarPDF.textContent = '⏳ Generando PDF...';
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const primerDato = datosActuales[0];
        const nombreCompleto = `${primerDato.nombres} ${primerDato.apellido_paterno} ${primerDato.apellido_materno || ''}`;
        const rut = primerDato.rut;
        const curso = `${primerDato.grado}° ${primerDato.nombre_curso}`;
        
        // --- INCORPORACIÓN DEL PROFESOR JEFE EN EL PDF ---
        const profeJefe = primerDato.profe_jefe_nombre ? `${primerDato.profe_jefe_nombre} ${primerDato.profe_jefe_apellido}` : 'No asignado';
        
        const asignaturaFiltro = filtroAsignatura.value;
        const asignaturas = {};
        let maxNotas = 0; 
        
        datosActuales.forEach(nota => {
            if (asignaturaFiltro && nota.nombre_asignatura !== asignaturaFiltro) {
                return;
            }
            
            if (!asignaturas[nota.nombre_asignatura]) {
                asignaturas[nota.nombre_asignatura] = {
                    notas: [],
                    docente: `${nota.docente_nombre} ${nota.docente_apellido}`
                };
            }
            asignaturas[nota.nombre_asignatura].notas.push(nota);
            
            if (asignaturas[nota.nombre_asignatura].notas.length > maxNotas) {
                maxNotas = asignaturas[nota.nombre_asignatura].notas.length;
            }
        });
        
        if (maxNotas === 0) maxNotas = 1; 
        
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('INFORME DE CALIFICACIONES', 105, 15, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text('Registro Académico', 105, 25, { align: 'center' });
        
        doc.setFontSize(9);
        const fechaEmision = new Date().toLocaleDateString('es-CL', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        doc.text(`Fecha de emisión: ${fechaEmision}`, 105, 32, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        let yPos = 50;
        
        doc.text('INFORMACIÓN DEL ESTUDIANTE', 14, yPos);
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        yPos += 8;
        
        doc.text(`Nombre: ${nombreCompleto}`, 14, yPos);
        yPos += 6;
        doc.text(`RUT: ${rut}`, 14, yPos);
        yPos += 6;
        
        // Imprimiendo el Curso y el Profesor Jefe en la misma línea
        doc.text(`Curso: ${curso} | Prof. Jefe: ${profeJefe}`, 14, yPos);
        
        if (asignaturaFiltro) {
            yPos += 6;
            doc.setFont(undefined, 'italic');
            doc.text(`Filtrado por: ${asignaturaFiltro}`, 14, yPos);
            doc.setFont(undefined, 'normal');
        }
        
        let sumaTotal = 0;
        let cantidadTotal = 0;
        
        Object.keys(asignaturas).forEach(nombreAsig => {
            const asig = asignaturas[nombreAsig];
            let suma = 0;
            let cantidad = 0;
            
            asig.notas.forEach(nota => {
                if (nota.nota !== null) {
                    suma += parseFloat(nota.nota);
                    cantidad++;
                }
            });
            
            if (cantidad > 0) {
                sumaTotal += suma / cantidad;
                cantidadTotal++;
            }
        });
        
        let promedioFinal = cantidadTotal > 0 ? (sumaTotal / cantidadTotal).toFixed(1) : '-';
        if (promedioFinal === '3.9') promedioFinal = '4.0'; 
        
        yPos += 6;
        doc.setFont(undefined, 'bold');
        doc.text(`Promedio General: ${promedioFinal}`, 14, yPos);
        
        yPos += 12;
        
        doc.setFontSize(11);
        doc.text('DETALLE DE CALIFICACIONES', 14, yPos);
        yPos += 5;
        
        const encabezados = ['Asignatura'];
        for (let i = 1; i <= maxNotas; i++) {
            encabezados.push(`N${i}`);
        }
        encabezados.push('Prom.');
        
        const tableData = [];
        
        Object.keys(asignaturas).sort().forEach((nombreAsig) => {
            const asig = asignaturas[nombreAsig];
            const fila = [`${nombreAsig}\n(Prof. ${asig.docente})`]; 
            
            let suma = 0;
            let cantidad = 0;
            
            for (let i = 0; i < maxNotas; i++) {
                if (i < asig.notas.length) {
                    const nota = asig.notas[i];
                    if (nota.nota !== null) {
                        const valorNota = parseFloat(nota.nota);
                        suma += valorNota;
                        cantidad++;
                        fila.push(valorNota.toFixed(1));
                    } else {
                        fila.push('Pte.'); 
                    }
                } else {
                    fila.push('-'); 
                }
            }
            
            let promedio = cantidad > 0 ? (suma / cantidad).toFixed(1) : '-';
            if (promedio === '3.9') promedio = '4.0'; 
            fila.push(promedio);
            
            tableData.push(fila);
        });
        
        doc.autoTable({
            startY: yPos,
            head: [encabezados],
            body: tableData,
            theme: 'striped',
            
            headStyles: {
                fillColor: [255, 255, 255], 
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
                textColor: [0, 0, 0] 
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [0, 0, 0] 
            },
            columnStyles: {
                0: { cellWidth: 70, halign: 'left', fontStyle: 'bold' } 
            },
            styles: { 
                halign: 'center', 
                valign: 'middle'  
            },
            margin: { left: 14, right: 14 }
        });
        
        const totalPages = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Página ${i} de ${totalPages}`,
                105,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
            doc.text(
                'Documento generado automáticamente - Sistema de Gestión Académica',
                105,
                doc.internal.pageSize.height - 5,
                { align: 'center' }
            );
        }
        
        const nombreArchivo = `Calificaciones_${nombreCompleto.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(nombreArchivo);
        
        btnDescargarPDF.disabled = false;
        btnDescargarPDF.textContent = '📥 Descargar PDF';
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar el PDF');
        btnDescargarPDF.disabled = false;
        btnDescargarPDF.textContent = '📥 Descargar PDF';
    }
}

function getColorNota(nota) {
    const n = parseFloat(nota);
    if (n >= 5.5) return 'nota-alta';
    if (n >= 4.0) return 'nota-media';
    return 'nota-baja';
}

function limpiarFiltros() {
    filtroCurso.value = '';
    filtroLetra.value = '';
    filtroAlumno.value = '';
    filtroAsignatura.value = '';
    aplicarFiltrosAlumnos();
    limpiarVista();
}

function limpiarVista() {
    infoAlumno.style.display = 'none';
    datosActuales = null;
    btnDescargarPDF.disabled = true;
    contenedorCalificaciones.innerHTML = `
        <div class="no-data">
            <p>👆 Selecciona un alumno para ver sus calificaciones</p>
        </div>
    `;
}

function mostrarCargando() {
    contenedorCalificaciones.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Cargando calificaciones...</p>
        </div>
    `;
}

function mostrarSinDatos() {
    infoAlumno.style.display = 'block';
    contenedorCalificaciones.innerHTML = `
        <div class="no-data">
            <p>📋 Este alumno no tiene calificaciones registradas</p>
        </div>
    `;
    btnDescargarPDF.disabled = false;
}

function mostrarError(mensaje) {
    contenedorCalificaciones.innerHTML = `
        <div class="no-data" style="color: #dc3545;">
            <p>⚠️ ${mensaje}</p>
        </div>
    `;
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        window.location.href = '/logout';
    }
}