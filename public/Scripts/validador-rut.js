/**
 * VALIDADOR Y BUSCADOR DE RUT CHILENO
 * Funcionalidades:
 * - Validación de RUT chileno con dígito verificador
 * - Formato automático (11.111.111-1)
 * - Búsqueda de alumnos por RUT
 * - Autocompletado con sugerencias
 */

// ===== VALIDACIÓN DE RUT =====

/**
 * Limpia el RUT dejando solo números y K
 * @param {string} rut - RUT a limpiar
 * @returns {string} RUT limpio
 */
function limpiarRut(rut) {
    return rut.toString().replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Formatea el RUT con puntos y guión (ej: 11.111.111-1)
 * @param {string} rut - RUT a formatear
 * @returns {string} RUT formateado
 */
function formatearRut(rut) {
    const rutLimpio = limpiarRut(rut);
    
    if (rutLimpio.length < 2) {
        return rutLimpio;
    }
    
    // Separar cuerpo y dígito verificador
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);
    
    // Formatear cuerpo con puntos
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${cuerpoFormateado}-${dv}`;
}

/**
 * Calcula el dígito verificador de un RUT
 * @param {string} rut - RUT sin dígito verificador
 * @returns {string} Dígito verificador calculado
 */
function calcularDigitoVerificador(rut) {
    const rutLimpio = limpiarRut(rut);
    const cuerpo = rutLimpio.slice(0, -1);
    
    let suma = 0;
    let multiplicador = 2;
    
    // Recorrer de derecha a izquierda
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo.charAt(i)) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const resto = suma % 11;
    const dv = 11 - resto;
    
    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
}

/**
 * Valida si un RUT chileno es válido
 * @param {string} rut - RUT a validar
 * @returns {boolean} true si es válido, false si no
 */
function validarRut(rut) {
    const rutLimpio = limpiarRut(rut);
    
    // Validar longitud mínima
    if (rutLimpio.length < 2) {
        return false;
    }
    
    // Separar cuerpo y dígito verificador
    const cuerpo = rutLimpio.slice(0, -1);
    const dvIngresado = rutLimpio.slice(-1);
    
    // Validar que el cuerpo sea numérico
    if (!/^\d+$/.test(cuerpo)) {
        return false;
    }
    
    // Calcular dígito verificador correcto
    const dvCalculado = calcularDigitoVerificador(cuerpo + '0');
    
    // Comparar
    return dvIngresado === dvCalculado;
}

// ===== BÚSQUEDA DE ALUMNOS POR RUT =====

/**
 * Configuración del buscador de RUT
 */
class BuscadorRut {
    constructor(config) {
        this.inputElement = config.inputElement;
        this.sugerenciasElement = config.sugerenciasElement;
        this.alumnos = config.alumnos || [];
        this.onSelect = config.onSelect || (() => {});
        this.minCaracteres = config.minCaracteres || 2;
        this.validarFormato = config.validarFormato !== false; // Por defecto true
        
        this.inicializar();
    }
    
    /**
     * Inicializa los event listeners
     */
    inicializar() {
        // Formateo automático mientras escribe
        this.inputElement.addEventListener('input', (e) => {
            const valorOriginal = e.target.value;
            const rutLimpio = limpiarRut(valorOriginal);
            
            // Formatear solo si tiene contenido
            if (rutLimpio.length > 0) {
                const rutFormateado = formatearRut(rutLimpio);
                
                // Actualizar solo si cambió (evitar bucle)
                if (valorOriginal !== rutFormateado) {
                    const cursorPos = e.target.selectionStart;
                    e.target.value = rutFormateado;
                    
                    // Mantener cursor en posición lógica
                    const nuevaPos = cursorPos + (rutFormateado.length - valorOriginal.length);
                    e.target.setSelectionRange(nuevaPos, nuevaPos);
                }
            }
            
            this.buscar();
        });
        
        // Mostrar sugerencias al hacer focus
        this.inputElement.addEventListener('focus', () => {
            if (this.inputElement.value.trim().length >= this.minCaracteres) {
                this.buscar();
            }
        });
        
        // Validar al perder foco
        this.inputElement.addEventListener('blur', () => {
            setTimeout(() => {
                if (this.validarFormato && this.inputElement.value.trim().length > 0) {
                    this.validarYMarcar();
                }
            }, 200);
        });
        
        // Cerrar sugerencias al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!this.inputElement.contains(e.target) && 
                !this.sugerenciasElement.contains(e.target)) {
                this.ocultarSugerencias();
            }
        });
        
        // Navegación con teclado (opcional)
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.ocultarSugerencias();
            }
        });
    }
    
    /**
     * Actualiza la lista de alumnos
     */
    actualizarAlumnos(alumnos) {
        this.alumnos = alumnos;
    }
    
    /**
     * Busca alumnos por RUT
     */
    buscar() {
        const busqueda = limpiarRut(this.inputElement.value);
        
        if (busqueda.length < this.minCaracteres) {
            this.ocultarSugerencias();
            return;
        }
        
        // Filtrar alumnos que coincidan
        const alumnosFiltrados = this.alumnos.filter(alumno => {
            const rutAlumnoLimpio = limpiarRut(alumno.rut);
            return rutAlumnoLimpio.includes(busqueda);
        });
        
        this.mostrarSugerencias(alumnosFiltrados);
    }
    
    /**
     * Muestra las sugerencias de alumnos
     */
    mostrarSugerencias(alumnos) {
        if (alumnos.length === 0) {
            this.sugerenciasElement.innerHTML = `
                <div class="sugerencia-item no-resultados">
                    ❌ No se encontraron alumnos con ese RUT
                </div>
            `;
            this.sugerenciasElement.style.display = 'block';
            return;
        }
        
        this.sugerenciasElement.innerHTML = '';
        
        alumnos.forEach(alumno => {
            const div = document.createElement('div');
            div.className = 'sugerencia-item';
            
            // Marcar si el RUT es válido
            const esValido = validarRut(alumno.rut);
            const iconoValidacion = esValido ? '✅' : '⚠️';
            
            div.innerHTML = `
                <div class="sugerencia-rut">
                    ${iconoValidacion} <strong>${formatearRut(alumno.rut)}</strong>
                </div>
                <div class="sugerencia-nombre">
                    ${alumno.nombre} ${alumno.apellido}
                </div>
                ${alumno.grado ? `
                    <div class="sugerencia-curso">
                        📚 ${alumno.grado}° ${alumno.nombre_curso}
                    </div>
                ` : ''}
            `;
            
            div.addEventListener('click', () => {
                this.seleccionar(alumno);
            });
            
            this.sugerenciasElement.appendChild(div);
        });
        
        this.sugerenciasElement.style.display = 'block';
    }
    
    /**
     * Oculta las sugerencias
     */
    ocultarSugerencias() {
        this.sugerenciasElement.style.display = 'none';
    }
    
    /**
     * Selecciona un alumno de las sugerencias
     */
    seleccionar(alumno) {
        this.inputElement.value = formatearRut(alumno.rut);
        this.ocultarSugerencias();
        this.onSelect(alumno);
    }
    
    /**
     * Valida el RUT ingresado y marca visualmente
     */
    validarYMarcar() {
        const rut = this.inputElement.value.trim();
        
        if (rut.length === 0) {
            this.inputElement.classList.remove('rut-valido', 'rut-invalido');
            return;
        }
        
        const esValido = validarRut(rut);
        
        if (esValido) {
            this.inputElement.classList.remove('rut-invalido');
            this.inputElement.classList.add('rut-valido');
        } else {
            this.inputElement.classList.remove('rut-valido');
            this.inputElement.classList.add('rut-invalido');
        }
        
        return esValido;
    }
    
    /**
     * Limpia el input y estado
     */
    limpiar() {
        this.inputElement.value = '';
        this.inputElement.classList.remove('rut-valido', 'rut-invalido');
        this.ocultarSugerencias();
    }
}

// ===== ESTILOS CSS (incluir en tu style.css) =====
const estilosCSS = `
/* Input de búsqueda RUT */
.input-buscar-rut {
    position: relative;
}

#inputBuscarRut {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s ease;
}

#inputBuscarRut:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

#inputBuscarRut.rut-valido {
    border-color: #28a745;
    background-color: #f0fff4;
}

#inputBuscarRut.rut-invalido {
    border-color: #dc3545;
    background-color: #fff5f5;
}

/* Sugerencias */
#sugerenciasRut {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 2px solid #667eea;
    border-radius: 8px;
    margin-top: 5px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    z-index: 1000;
}

.sugerencia-item {
    padding: 12px 15px;
    cursor: pointer;
    transition: background 0.2s ease;
    border-bottom: 1px solid #f0f0f0;
}

.sugerencia-item:last-child {
    border-bottom: none;
}

.sugerencia-item:hover {
    background: #f8f9fa;
}

.sugerencia-item.no-resultados {
    color: #6c757d;
    cursor: default;
    text-align: center;
}

.sugerencia-rut {
    font-size: 14px;
    margin-bottom: 4px;
}

.sugerencia-nombre {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
}

.sugerencia-curso {
    font-size: 12px;
    color: #667eea;
    font-weight: 500;
}
`;

// Exportar funciones (si usas módulos ES6)
// export { validarRut, formatearRut, limpiarRut, calcularDigitoVerificador, BuscadorRut };

// Para uso directo en HTML sin módulos:
window.RutValidator = {
    validar: validarRut,
    formatear: formatearRut,
    limpiar: limpiarRut,
    calcularDV: calcularDigitoVerificador,
    BuscadorRut: BuscadorRut
};