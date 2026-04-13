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
                notasS1: [],
                notasS2: [],
                docente: `${nota.docente_nombre} ${nota.docente_apellido}`
            };
        }

        if (nota.semestre == 2 || nota.semestre === '2') {
            asignaturas[nota.nombre_asignatura].notasS2.push(nota);
        } else {
            asignaturas[nota.nombre_asignatura].notasS1.push(nota);
        }
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

    let sumaTotalAnual = 0;
    let cantidadTotalAnual = 0;
    let html = '';

    Object.keys(asignaturas).sort().forEach(nombreAsig => {
        const asig = asignaturas[nombreAsig];

        const calcProm = (notas) => {
            let suma = 0, cant = 0;
            notas.forEach(n => {
                if (n.nota !== null) {
                    suma += parseFloat(n.nota);
                    cant++;
                }
            });
            let prom = cant > 0 ? (suma / cant).toFixed(1) : null;
            if (prom === '3.9') prom = '4.0';
            return { prom, cant };
        };

        const resS1 = calcProm(asig.notasS1);
        const resS2 = calcProm(asig.notasS2);
        const promS1 = resS1.prom;
        const promS2 = resS2.prom;

        let promAnualVal = null;
        if (promS1 !== null && promS2 !== null) {
            promAnualVal = ((parseFloat(promS1) + parseFloat(promS2)) / 2).toFixed(1);
        } else if (promS1 !== null) {
            promAnualVal = promS1;
        } else if (promS2 !== null) {
            promAnualVal = promS2;
        }
        if (promAnualVal === '3.9') promAnualVal = '4.0';

        if (promAnualVal !== null) {
            sumaTotalAnual += parseFloat(promAnualVal);
            cantidadTotalAnual++;
        }

        const renderNotas = (notas) => {
            if (notas.length === 0) return '<div class="sin-notas">No hay evaluaciones registradas</div>';
            return `
                <div class="notas-grid">
                    ${notas.map(nota => `
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
                </div>
            `;
        };

        html += `
            <div class="asignatura-card">
                <div class="asignatura-header">
                    <div style="flex: 1;">
                        <h3>
                            📚 ${nombreAsig}
                        </h3>
                        <span style="font-size: 13px; font-weight: normal; opacity: 0.9; display: block; margin-top: 5px;">
                            (Prof. ${asig.docente})
                        </span>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; text-align: right; justify-content: flex-end;">
                        ${promS1 !== null ? `<span class="promedio-asignatura ${getColorNota(promS1)}" style="font-size: 0.85em; padding: 4px 8px;">S1: ${promS1}</span>` : `<span class="promedio-asignatura nota-pendiente" style="font-size: 0.85em; padding: 4px 8px;">S1: S/N</span>`}
                        ${promS2 !== null ? `<span class="promedio-asignatura ${getColorNota(promS2)}" style="font-size: 0.85em; padding: 4px 8px;">S2: ${promS2}</span>` : `<span class="promedio-asignatura nota-pendiente" style="font-size: 0.85em; padding: 4px 8px;">S2: S/N</span>`}
                        ${promAnualVal !== null ? `<span class="promedio-asignatura ${getColorNota(promAnualVal)}" style="padding: 4px 8px;">Final: ${promAnualVal}</span>` : `<span class="promedio-asignatura nota-pendiente" style="padding: 4px 8px;">Final: S/N</span>`}
                    </div>
                </div>
                <div class="semestres-container" style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
                    <div class="semestre-section">
                        <h4 style="margin: 0 0 10px 0; color: #555; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Primer Semestre</h4>
                        <div class="notas-lista" style="margin: 0;">
                            ${renderNotas(asig.notasS1)}
                        </div>
                    </div>
                    
                    ${asig.notasS2.length > 0 ? `
                    <div class="semestre-section" style="margin-top: 10px;">
                        <h4 style="margin: 0 0 10px 0; color: #555; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Segundo Semestre</h4>
                        <div class="notas-lista" style="margin: 0;">
                            ${renderNotas(asig.notasS2)}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    contenedorCalificaciones.innerHTML = html;

    if (cantidadTotalAnual > 0) {
        let promedioFinal = (sumaTotalAnual / cantidadTotalAnual).toFixed(1);
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
        const doc = new jsPDF({ orientation: 'landscape' });

        const primerDato = datosActuales[0];
        const nombreCompleto = `${primerDato.nombres} ${primerDato.apellido_paterno} ${primerDato.apellido_materno || ''}`;
        const rut = primerDato.rut;
        const curso = `${primerDato.grado}° ${primerDato.nombre_curso}`;

        // --- INCORPORACIÓN DEL PROFESOR JEFE EN EL PDF ---
        const profeJefe = primerDato.profe_jefe_nombre ? `${primerDato.profe_jefe_nombre} ${primerDato.profe_jefe_apellido}` : 'No asignado';

        const asignaturaFiltro = filtroAsignatura.value;
        const asignaturas = {};
        let maxNotasS1 = 0;
        let maxNotasS2 = 0;

        datosActuales.forEach(nota => {
            if (asignaturaFiltro && nota.nombre_asignatura !== asignaturaFiltro) {
                return;
            }

            if (!asignaturas[nota.nombre_asignatura]) {
                asignaturas[nota.nombre_asignatura] = {
                    notasS1: [],
                    notasS2: [],
                    docente: `${nota.docente_nombre} ${nota.docente_apellido}`
                };
            }

            if (nota.semestre == 2 || nota.semestre === '2') {
                asignaturas[nota.nombre_asignatura].notasS2.push(nota);
                if (asignaturas[nota.nombre_asignatura].notasS2.length > maxNotasS2) {
                    maxNotasS2 = asignaturas[nota.nombre_asignatura].notasS2.length;
                }
            } else {
                asignaturas[nota.nombre_asignatura].notasS1.push(nota);
                if (asignaturas[nota.nombre_asignatura].notasS1.length > maxNotasS1) {
                    maxNotasS1 = asignaturas[nota.nombre_asignatura].notasS1.length;
                }
            }
        });

        if (maxNotasS1 === 0) maxNotasS1 = 1;

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 297, 40, 'F');

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('INFORME DE CALIFICACIONES', 148.5, 15, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text('Registro Académico', 148.5, 25, { align: 'center' });

        doc.setFontSize(9);
        const fechaEmision = new Date().toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(`Fecha de emisión: ${fechaEmision}`, 148.5, 32, { align: 'center' });

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

        let sumaTotalAnual = 0;
        let cantidadTotalAnual = 0;

        Object.keys(asignaturas).forEach(nombreAsig => {
            const asig = asignaturas[nombreAsig];
            const getProm = (notas) => {
                let s = 0, c = 0;
                notas.forEach(n => { if (n.nota !== null) { s += parseFloat(n.nota); c++; } });
                let p = c > 0 ? (s / c).toFixed(1) : null;
                if (p === '3.9') p = '4.0';
                return p;
            };
            let promS1 = getProm(asig.notasS1);
            let promS2 = getProm(asig.notasS2);
            let promAnual = null;
            if (promS1 !== null && promS2 !== null) {
                promAnual = ((parseFloat(promS1) + parseFloat(promS2)) / 2).toFixed(1);
            } else if (promS1 !== null) {
                promAnual = promS1;
            } else if (promS2 !== null) {
                promAnual = promS2;
            }
            if (promAnual === '3.9') promAnual = '4.0';

            if (promAnual !== null) {
                sumaTotalAnual += parseFloat(promAnual);
                cantidadTotalAnual++;
            }
        });

        let promedioFinal = cantidadTotalAnual > 0 ? (sumaTotalAnual / cantidadTotalAnual).toFixed(1) : '-';
        if (promedioFinal === '3.9') promedioFinal = '4.0';

        yPos += 6;
        doc.setFont(undefined, 'bold');
        doc.text(`Promedio General: ${promedioFinal}`, 14, yPos);

        yPos += 12;

        doc.setFontSize(11);
        doc.text('DETALLE DE CALIFICACIONES', 14, yPos);
        yPos += 5;

        const encabezados = ['Asignatura'];
        for (let i = 1; i <= maxNotasS1; i++) {
            encabezados.push(`1S-N${i}`);
        }
        encabezados.push('Prom. 1S');

        if (maxNotasS2 > 0) {
            for (let i = 1; i <= maxNotasS2; i++) {
                encabezados.push(`2S-N${i}`);
            }
            encabezados.push('Prom. 2S');
        }
        encabezados.push('Final');

        const tableData = [];

        Object.keys(asignaturas).sort().forEach((nombreAsig) => {
            const asig = asignaturas[nombreAsig];
            const fila = [`${nombreAsig}\n(Prof. ${asig.docente})`];

            // Semestre 1
            let sumaS1 = 0;
            let cantS1 = 0;
            for (let i = 0; i < maxNotasS1; i++) {
                if (i < asig.notasS1.length) {
                    const nota = asig.notasS1[i];
                    if (nota.nota !== null) {
                        const valorNota = parseFloat(nota.nota);
                        sumaS1 += valorNota;
                        cantS1++;
                        fila.push(valorNota.toFixed(1));
                    } else {
                        fila.push('Pte.');
                    }
                } else {
                    fila.push('-');
                }
            }
            let promS1Str = '-';
            let promS1Val = null;
            if (cantS1 > 0) {
                promS1Str = (sumaS1 / cantS1).toFixed(1);
                if (promS1Str === '3.9') promS1Str = '4.0';
                promS1Val = parseFloat(promS1Str);
            }
            fila.push(promS1Str);

            // Semestre 2
            let promS2Val = null;
            if (maxNotasS2 > 0) {
                let sumaS2 = 0;
                let cantS2 = 0;
                let promS2Str = '-';
                for (let i = 0; i < maxNotasS2; i++) {
                    if (i < asig.notasS2.length) {
                        const nota = asig.notasS2[i];
                        if (nota.nota !== null) {
                            const valorNota = parseFloat(nota.nota);
                            sumaS2 += valorNota;
                            cantS2++;
                            fila.push(valorNota.toFixed(1));
                        } else {
                            fila.push('Pte.');
                        }
                    } else {
                        fila.push('-');
                    }
                }
                if (cantS2 > 0) {
                    promS2Str = (sumaS2 / cantS2).toFixed(1);
                    if (promS2Str === '3.9') promS2Str = '4.0';
                    promS2Val = parseFloat(promS2Str);
                }
                fila.push(promS2Str);
            }

            // Promedio Final
            let promFinalStr = '-';
            if (promS1Val !== null && promS2Val !== null) {
                promFinalStr = ((promS1Val + promS2Val) / 2).toFixed(1);
            } else if (promS1Val !== null) {
                promFinalStr = promS1Val.toFixed(1);
            } else if (promS2Val !== null) {
                promFinalStr = promS2Val.toFixed(1);
            }
            if (promFinalStr === '3.9') promFinalStr = '4.0';
            
            fila.push(promFinalStr);

            tableData.push(fila);
        });

        doc.autoTable({
            startY: yPos,
            head: [encabezados],
            body: tableData,
            theme: 'striped',

            headStyles: {
                fillColor: [240, 240, 240],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
                textColor: [0, 0, 0]
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 50, halign: 'left', fontStyle: 'bold' }
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
                148.5,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
            doc.text(
                'Documento generado automáticamente - Sistema de Gestión Académica',
                148.5,
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