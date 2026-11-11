import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Interfaz actualizada según el Laboratorio 8
interface Actividad {
  id: string;
  titulo: string;
  urgencia: number; // 0 a 100
  complejidad: number; // 0 a 100
  factorGrupal: number; // 0 o 100
  bonoProductividad: number; // 0 a 100
  tiempoEjecucion: number; // en horas
  completada: boolean;
}

interface ResultadoPrioridad {
  id: string;
  actividad: Actividad;
  puntaje: number;
}

export default function PanelScreen() {
  // --- ESTADOS DE CONTROL Y GAMIFICACIÓN ---
  const [pestañaActiva, setPestañaActiva] = useState<
    'misiones' | 'nueva_tarea' | 'enfoque'
  >('misiones');
  const [nivel, setNivel] = useState(0);
  const [xp, setXp] = useState(0);
  const [barraVerde, setBarraVerde] = useState(false);

  // --- VARIABLES DE CONTROL DEL ALGORITMO ---
  const [indicadorIteraciones, setIndicadorIteraciones] = useState(0);
  const [modoAlgoritmo, setModoAlgoritmo] = useState('Ninguno (0 Tareas)');

  // --- LISTA DE ACTIVIDADES REALES ---
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [listaPriorizada, setListaPriorizada] = useState<
    ResultadoPrioridad[]
  >([]);

  // --- ESTADOS DE CARGA DE PDF ---
  const [cargandoPdf, setCargandoPdf] = useState(false);
  const [pdfCargadoExito, setPdfCargadoExito] = useState(false);

  // --- ESTADOS DEL FORMULARIO MANUAL ---
  const [nombreActividad, setNombreActividad] = useState('');
  const [urgenciaInput, setUrgenciaInput] = useState('50');
  const [complejidadInput, setComplejidadInput] = useState('50');
  const [tiempoExec, setTiempoExec] = useState('4');
  const [esGrupal, setEsGrupal] = useState(false);
  const [bonoPreguntas, setBonoPreguntas] = useState(false);
  const [exitoVerde, setExitoVerde] = useState(false);

  // --- ESTADOS DEL TEMPORIZADOR POMODORO ---
  const [tiempoSegundos, setTiempoSegundos] = useState(1500);
  const [cronometroCorriendo, setCronometroCorriendo] = useState(false);

  // --- MOTOR INTELIGENTE MATEMÁTICO: PSO-GWO ---
  const optimizarPSOGWO = (pendientes: Actividad[]): number[] => {
    const numParticulas = 10;
    const iteraciones = 20;

    // Cada partícula tiene 4 posiciones (pesos) y 4 velocidades.
    const poblacion = Array.from({ length: numParticulas }, () => ({
      posicion: Array.from({ length: 4 }, () => Math.random()),
      velocidad: Array.from(
        { length: 4 },
        () => (Math.random() - 0.5) * 0.1
      ),
      mejorPosicionPersonal: Array.from({ length: 4 }, () => 0),
      mejorAptitudPersonal: -Infinity,
    }));

    // Inicializar líderes GWO.
    let l_alpha = [0.25, 0.25, 0.25, 0.25];
    let l_beta = [0.25, 0.25, 0.25, 0.25];
    let l_delta = [0.25, 0.25, 0.25, 0.25];

    let f_alpha = -Infinity;
    let f_beta = -Infinity;
    let f_delta = -Infinity;

    // FUNCIÓN OBJETIVO
    const evaluarAptitud = (pesos: number[]) => {
      let aptitudTotal = 0;

      pendientes.forEach((act) => {
        const puntajeMision =
          pesos[0] * (act.urgencia / 100) +
          pesos[1] * (act.complejidad / 100) +
          pesos[2] * (act.factorGrupal / 100) +
          pesos[3] * (act.bonoProductividad / 100);

        const penalizacionTiempo = act.tiempoEjecucion > 6 ? 0.8 : 1.0;
        aptitudTotal += puntajeMision * penalizacionTiempo;
      });

      return aptitudTotal;
    };

    // BUCLE HÍBRIDO METAEURÍSTICO
    for (let t = 0; t < iteraciones; t++) {
      const w_inercia = 0.9 - t * (0.5 / iteraciones);

      for (let i = 0; i < numParticulas; i++) {
        const p = poblacion[i];
        const aptitudActual = evaluarAptitud(p.posicion);

        // Memoria e inercia de PSO.
        if (aptitudActual > p.mejorAptitudPersonal) {
          p.mejorAptitudPersonal = aptitudActual;
          p.mejorPosicionPersonal = [...p.posicion];
        }

        // Liderazgo jerárquico de GWO.
        if (aptitudActual > f_alpha) {
          f_delta = f_beta;
          l_delta = [...l_beta];
          f_beta = f_alpha;
          l_beta = [...l_alpha];
          f_alpha = aptitudActual;
          l_alpha = [...p.posicion];
        } else if (aptitudActual > f_beta) {
          f_delta = f_beta;
          l_delta = [...l_beta];
          f_beta = aptitudActual;
          l_beta = [...p.posicion];
        } else if (aptitudActual > f_delta) {
          f_delta = aptitudActual;
          l_delta = [...p.posicion];
        }
      }

      // Actualización de posiciones alrededor de los tres líderes.
      for (let i = 0; i < numParticulas; i++) {
        const p = poblacion[i];

        for (let d = 0; d < 4; d++) {
          const r1 = Math.random();
          const r2 = Math.random();
          const a = 2 - 2 * (t / iteraciones);

          const X1 =
            l_alpha[d] -
            (2 * a * r1 - a) *
              Math.abs(2 * r2 * l_alpha[d] - p.posicion[d]);

          const X2 =
            l_beta[d] -
            (2 * a * r1 - a) *
              Math.abs(2 * r2 * l_beta[d] - p.posicion[d]);

          // Se corrigió la multiplicación que faltaba en la expresión original.
          const X3 =
            l_delta[d] -
            (2 * a * r1 - a) *
              Math.abs(2 * r2 * l_delta[d] - p.posicion[d]);

          // Combinación híbrida de velocidad (PSO) y posición (GWO).
          p.velocidad[d] =
            w_inercia * p.velocidad[d] +
            2 *
              Math.random() *
              (p.mejorPosicionPersonal[d] - p.posicion[d]);

          p.posicion[d] = (X1 + X2 + X3) / 3 + p.velocidad[d];

          // Restricción de límites de peso [0.05 a 1.0].
          if (p.posicion[d] < 0.05) p.posicion[d] = 0.05;
          if (p.posicion[d] > 1.0) p.posicion[d] = 1.0;
        }
      }
    }

    setIndicadorIteraciones(iteraciones * numParticulas);
    return l_alpha;
  };

  // --- REGLA DE ACTIVACIÓN DINÁMICA ---
  useEffect(() => {
    const pendientes = actividades.filter((act) => !act.completada);

    if (pendientes.length === 0) {
      setListaPriorizada([]);
      setModoAlgoritmo('Estado Vacío (0 Tareas)');
      setIndicadorIteraciones(0);
      return;
    }

    // Una sola actividad: no necesita metaheurística.
    if (pendientes.length === 1) {
      setListaPriorizada([
        {
          id: pendientes[0].id,
          actividad: pendientes[0],
          puntaje: 100.0,
        },
      ]);
      setModoAlgoritmo('Directo (Sin Optimización)');
      setIndicadorIteraciones(0);
      return;
    }

    // Dos o más actividades: ejecutar PSO-GWO.
    setModoAlgoritmo('Metaheurística PSO-GWO Activa');
    const mejoresPesos = optimizarPSOGWO(pendientes);

    const resultados = pendientes.map((act) => {
      const puntajeFinal =
        mejoresPesos[0] * act.urgencia +
        mejoresPesos[1] * act.complejidad +
        mejoresPesos[2] * act.factorGrupal +
        mejoresPesos[3] * act.bonoProductividad;

      return {
        id: act.id,
        actividad: act,
        puntaje: parseFloat(puntajeFinal.toFixed(1)),
      };
    });

    resultados.sort((a, b) => b.puntaje - a.puntaje);
    setListaPriorizada(resultados);
  }, [actividades]);

  // --- TEMPORIZADOR POMODORO ---
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | null = null;

    if (cronometroCorriendo && tiempoSegundos > 0) {
      intervalo = setInterval(
        () => setTiempoSegundos((prev) => prev - 1),
        1000
      );
    } else if (tiempoSegundos === 0) {
      setCronometroCorriendo(false);
      setTiempoSegundos(1500);
      setBarraVerde(true);

      setXp((prev) => {
        const nuevoXp = prev + 15;

        if (nuevoXp >= 100) {
          setNivel((n) => n + 1);
          return nuevoXp - 100;
        }

        return nuevoXp;
      });

      setTimeout(() => setBarraVerde(false), 1500);
      Alert.alert(
        '🎉 ¡Sesión Terminada!',
        'Has obtenido +15 XP de productividad.'
      );
    }

    return () => {
      if (intervalo) clearInterval(intervalo);
    };
  }, [cronometroCorriendo, tiempoSegundos]);

  const formatearTiempo = (totSegundos: number) => {
    const min = Math.floor(totSegundos / 60).toString().padStart(2, '0');
    const seg = (totSegundos % 60).toString().padStart(2, '0');
    return `${min}:${seg}`;
  };

  const alternarCronometro = () =>
    setCronometroCorriendo(!cronometroCorriendo);

  const reiniciarCronometro = () => {
    setCronometroCorriendo(false);
    setTiempoSegundos(1500);
  };

    // --- FLUJO A: CARGAR CASO PDF REAL DESDE EL TELÉFONO ---
  const manejarCargaPdf = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const archivo = resultado.assets[0];
        
        setCargandoPdf(true);
        setPdfCargadoExito(false);

        setTimeout(() => {
          setCargandoPdf(false);
          
          // Rellenamos el formulario PSO-GWO con el nombre real del PDF
          setNombreActividad(archivo.name.replace('.pdf', ''));
          setUrgenciaInput('85');     // Sugerencia inicial editable
          setComplejidadInput('75');  // Sugerencia inicial editable
          setTiempoExec('6');         // Horas estimadas editables
          setEsGrupal(true);
          setBonoPreguntas(true);

          // Saltamos al formulario para que edites lo que necesites antes de guardar
          setPestañaActiva('nueva_tarea');
          Alert.alert("PDF Vinculado", `Se cargó "${archivo.name}". Ajusta la urgencia o complejidad si deseas y envía al motor.`);
        }, 1200);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo abrir el explorador de archivos.");
    }
  };

  // --- FLUJO B: REGISTRAR TAREA MANUAL ---
  const registrarTareaManual = () => {
    if (nombreActividad.trim() === '') {
      Alert.alert('Campos incompletos', 'Por favor ingresa el título.');
      return;
    }

    setExitoVerde(true);

    setTimeout(() => {
      const nuevaAct: Actividad = {
        id: `M${actividades.length + 1}`,
        titulo: nombreActividad,
        urgencia: parseFloat(urgenciaInput) || 50,
        complejidad: parseFloat(complejidadInput) || 50,
        factorGrupal: esGrupal ? 100 : 0,
        bonoProductividad: bonoPreguntas ? 80 : 20,
        tiempoEjecucion: parseFloat(tiempoExec) || 4,
        completada: false,
      };

      setActividades((prev) => [...prev, nuevaAct]);
      setNombreActividad('');
      setExitoVerde(false);
      setPestañaActiva('misiones');
    }, 1000);
  };

  // --- FLUJO C: COMPLETAR MISIÓN ---
  const completarMision = (id: string, puntosGanados: number) => {
    setBarraVerde(true);

    setXp((prevXp) => {
      const incremento = Math.round(puntosGanados / 3);
      const nuevoXp = prevXp + incremento;

      if (nuevoXp >= 100) {
        setNivel((prevNivel) => prevNivel + 1);
        Alert.alert(
          '🎉 ¡NIVEL COMPLETADO!',
          `¡Subiste al Nivel ${nivel + 1}!`
        );
        return nuevoXp - 100;
      }

      return nuevoXp;
    });

    // Cambia el estado de la actividad a completada.
    setActividades((prev) =>
      prev.map((act) =>
        act.id === id ? { ...act, completada: true } : act
      )
    );

    setTimeout(() => setBarraVerde(false), 1500);
  };

  // --- INTERFAZ ---
  return (
    <View style={styles.contenedor}>
      {/* --- CABECERA DE GAMIFICACIÓN --- */}
      <View style={styles.cabecera}>
        <View style={styles.perfilFila}>
          <View style={styles.avatarSq}>
            <Text style={styles.avatarTexto}>SQ</Text>
          </View>

          <View>
            <Text style={styles.usuarioTitulo}>StudyQuest</Text>
            <Text style={styles.motorVersion}>
              Estrategia: {modoAlgoritmo}
            </Text>
          </View>

          <View style={styles.insigniaNivel}>
            <Text style={styles.textoInsignia}>
              🏆 Nivel {nivel} | {xp} XP
            </Text>
          </View>
        </View>

        <View style={styles.barraProgresoContenedor}>
          <View
            style={[
              styles.barraProgresoRelleno,
              {
                width: `${xp}%`,
                backgroundColor: barraVerde ? '#4CAF50' : '#A87C5C',
              },
            ]}
          />
        </View>

        <View style={styles.progresoEtiquetas}>
          <Text style={styles.textoProgresoMin}>
            Evaluaciones IA: {indicadorIteraciones}
          </Text>
          <Text style={styles.textoProgresoMax}>
            {xp} / 100 XP para Nivel {nivel + 1}
          </Text>
        </View>
      </View>

      {/* --- PESTAÑA: LISTADO DE MISIONES --- */}
      {pestañaActiva === 'misiones' && (
        <View style={{ flex: 1 }}>
          <View style={styles.tituloSeccionFila}>
            <Text style={styles.tituloSeccion}>
              MISIONES ACADÉMICAS{' '}
              <Text style={styles.contadorMisiones}>
                {listaPriorizada.length}
              </Text>
            </Text>

            <TouchableOpacity
              style={styles.botonCargarPdf}
              onPress={manejarCargaPdf}
            >
              <Text style={styles.textoCargarPdf}>📥 Cargar Caso PDF</Text>
            </TouchableOpacity>
          </View>

          {cargandoPdf && (
            <View style={styles.tarjetaSimulacion}>
              <Text style={styles.textoSimulacionTitulo}>
                Procesando Heurísticas...
              </Text>
              <ActivityIndicator
                size="large"
                color="#7A5C43"
                style={{ marginTop: 30 }}
              />
            </View>
          )}

          {pdfCargadoExito && (
            <View style={styles.tarjetaSimulacion}>
              <Text style={styles.textoSimulacionExito}>¡Priorizado!</Text>
            </View>
          )}

          {!cargandoPdf && !pdfCargadoExito && (
            listaPriorizada.length === 0 ? (
              <View style={styles.contenedorVacio}>
                <Text style={styles.iconoEspada}>⚔️</Text>
                <Text style={styles.textoVacioTitulo}>
                  ¡Felicidades, bitácora limpia!
                </Text>
                <Text style={styles.textoVacioSub}>
                  No hay misiones compitiendo. Agrega tareas o sube el caso de
                  estudio.
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.listaContenedor}
                showsVerticalScrollIndicator={false}
              >
                {listaPriorizada.map((item, indice) => (
                  <View key={item.id} style={styles.tarjetaMision}>
                    {indice === 0 && listaPriorizada.length > 1 && (
                      <View style={styles.etiquetaPrioridad}>
                        <Text style={styles.textoPrioridad}>
                          LÍDER ALPHA
                        </Text>
                      </View>
                    )}

                    <Text style={styles.idMision}>
                      Código: {item.id}{' '}
                      {item.actividad.factorGrupal > 0
                        ? '• 👥 Proyecto'
                        : '• 👤 Individual'}
                    </Text>

                    <Text style={styles.actividadTitulo}>
                      {item.actividad.titulo}
                    </Text>

                    <View style={styles.filaTags}>
                      <View style={styles.tag}>
                        <Text style={styles.tagTexto}>
                          🚨 Urgencia: {item.actividad.urgencia}
                        </Text>
                      </View>

                      <View style={styles.tag}>
                        <Text style={styles.tagTexto}>
                          📊 Peso Exec: {item.actividad.tiempoEjecucion}h
                        </Text>
                      </View>

                      {item.actividad.bonoProductividad > 50 && (
                        <View style={[styles.tag, styles.tagBono]}>
                          <Text style={styles.tagTexto}>
                            ✨ Bonus Activo
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.filaAccion}>
                      <View>
                        <Text style={styles.puntajeLabel}>
                          ÍNDICE CRÍTICO CALCULADO
                        </Text>
                        <Text style={styles.puntajeValor}>
                          {item.puntaje}{' '}
                          <Text style={styles.ptsUnidad}>pts</Text>
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <TouchableOpacity
                          style={styles.botonEnfoque}
                          onPress={() => setPestañaActiva('enfoque')}
                        >
                          <Text style={styles.botonEnfoqueTexto}>
                            ▷ Enfoque
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.botonCheck}
                          onPress={() =>
                            completarMision(item.id, item.puntaje)
                          }
                        >
                          <Text style={styles.textoCheck}>✓</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )
          )}
        </View>
      )}

            {/* --- VISTA PESTAÑA NUEVA TAREA (MANUAL E INTERACTIVO) --- */}
      {pestañaActiva === 'nueva_tarea' && (
        <ScrollView contentContainerStyle={styles.listaContenedor} keyboardShouldPersistTaps="handled">
          <View style={[styles.tarjetaFormulario, exitoVerde && styles.tarjetaFormularioVerde]}>
            <View style={styles.filaFormTitulo}>
              <View style={styles.iconoMasForm}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>+</Text></View>
              <View>
                <Text style={styles.tituloForm}>Registrar Variable Académica</Text>
                <Text style={styles.subtituloForm}>El enjambre PSO-GWO optimizará el coeficiente de este elemento</Text>
              </View>
            </View>

            {/* Entrada del Nombre de la Tarea */}
            <Text style={styles.labelForm}>TÍTULO DE LA ASIGNATURA / TAREA</Text>
            <TextInput 
              style={styles.inputForm} 
              placeholder="Ej. Matemáticas, Estructuras, Tesis..." 
              placeholderTextColor="#8A7A70"
              value={nombreActividad} 
              onChangeText={setNombreActividad} // Guarda lo que escribe el usuario
            />

            {/* Fila de Parámetros Numéricos */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <View style={{ width: '48%' }}>
                <Text style={styles.labelForm}>URGENCIA (0-100)</Text>
                <TextInput 
                  style={styles.inputForm} 
                  keyboardType="numeric" 
                  maxLength={3}
                  placeholder="50"
                  placeholderTextColor="#8A7A70"
                  value={urgenciaInput} 
                  onChangeText={setUrgenciaInput} // Modifica la urgencia real
                />
              </View>
              <View style={{ width: '48%' }}>
                <Text style={styles.labelForm}>COMPLEJIDAD (0-100)</Text>
                <TextInput 
                  style={styles.inputForm} 
                  keyboardType="numeric" 
                  maxLength={3}
                  placeholder="50"
                  placeholderTextColor="#8A7A70"
                  value={complejidadInput} 
                  onChangeText={setComplejidadInput} // Modifica la complejidad real
                />
              </View>
            </View>

            {/* Tiempo Estimado */}
            <Text style={styles.labelForm}>TIEMPO ESTIMADO DE EJECUCIÓN (HRS)</Text>
            <TextInput 
              style={styles.inputForm} 
              keyboardType="numeric" 
              placeholder="4"
              placeholderTextColor="#8A7A70"
              value={tiempoExec} 
              onChangeText={setTiempoExec} // Modifica las horas estimadas de trabajo
            />

            {/* Switch de Proyecto Grupal */}
            <View style={styles.filaSwitch}>
              <Text style={styles.textoSwitch}>👥 ¿Es una entrega colectiva o proyecto grupal?</Text>
              <Switch 
                value={esGrupal} 
                onValueChange={setEsGrupal} // Cambia dinámicamente entre True y False
                trackColor={{ false: '#C4B5AC', true: '#7A5C43' }} 
                thumbColor={esGrupal ? '#FFF' : '#F4F3F0'}
              />
            </View>

            {/* Switch de Desafío de Productividad */}
            <View style={styles.filaSwitch}>
              <Text style={styles.textoSwitch}>✨ Activar bonificación de desafíos de productividad</Text>
              <Switch 
                value={bonoPreguntas} 
                onValueChange={setBonoPreguntas} // Cambia dinámicamente entre True y False
                trackColor={{ false: '#C4B5AC', true: '#7A5C43' }} 
                thumbColor={bonoPreguntas ? '#FFF' : '#F4F3F0'}
              />
            </View>

            {/* Botón de Envió con animación verde */}
            <TouchableOpacity 
              style={[styles.botonCalcular, exitoVerde && styles.botonCalcularVerde]} 
              onPress={registrarTareaManual}
            >
              <Text style={styles.textoBotonCalcular}>
                {exitoVerde ? '✓ ¡Misión Indexada!' : '💾 Enviar al Motor de Optimización'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}


      {/* --- PESTAÑA: ENFOQUE (TEMPORIZADOR) --- */}
      {pestañaActiva === 'enfoque' && (
        <ScrollView
          contentContainerStyle={styles.listaContenedor}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.tarjetaFormulario}>
            <View style={styles.tagSesionProductividad}>
              <Text style={styles.textoTagSesion}>
                🎯 Sesión de Enfoque Activa
              </Text>
            </View>

            {!cronometroCorriendo ? (
              <View style={styles.contenedorTextosEnfoque}>
                <Text style={styles.tituloEnfoque}>
                  Elige un objetivo de la lista
                </Text>
                <Text style={styles.subtituloEnfoque}>
                  Al completar los 25 minutos, la IA te otorgará +15 XP de
                  inercia
                </Text>
              </View>
            ) : (
              <View style={styles.contenedorTextosEnfoque}>
                <Text style={styles.fraseEnfoque}>
                  "La forma más rápida de hacer muchas cosas es hacer solo una
                  a la vez."
                </Text>
                <Text style={styles.autorFrase}>mozart</Text>
              </View>
            )}

            <View
              style={[
                styles.circuloReloj,
                cronometroCorriendo && styles.circuloRelojActivo,
              ]}
            >
              <Text style={styles.numerosReloj}>
                {formatearTiempo(tiempoSegundos)}
              </Text>
              <Text style={styles.etiquetaReloj}>MINUTOS</Text>
            </View>

            <View style={styles.filaBotonesReloj}>
              <TouchableOpacity
                style={[styles.botonCalcular, styles.botonIniciarReloj]}
                onPress={alternarCronometro}
              >
                <Text style={styles.textoBotonCalcular}>
                  {cronometroCorriendo ? 'Pausar Enfoque' : 'Iniciar Reloj'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botonResetReloj}
                onPress={reiniciarCronometro}
              >
                <Text style={styles.textoBotonReset}>⟳</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* --- BARRA DE MENÚ INFERIOR --- */}
      <View style={styles.menuInferior}>
        <TouchableOpacity
          style={styles.opcionMenu}
          onPress={() => setPestañaActiva('misiones')}
        >
          <Text
            style={[
              styles.iconoMenu,
              pestañaActiva === 'misiones' && styles.menuActivo,
            ]}
          >
            ⚔️
          </Text>
          <Text
            style={[
              styles.textoMenu,
              pestañaActiva === 'misiones' && styles.menuActivo,
            ]}
          >
            Misiones
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.opcionMenu}
          onPress={() => setPestañaActiva('nueva_tarea')}
        >
          <Text
            style={[
              styles.iconoMenu,
              pestañaActiva === 'nueva_tarea' && styles.menuActivo,
            ]}
          >
            +
          </Text>
          <Text
            style={[
              styles.textoMenu,
              pestañaActiva === 'nueva_tarea' && styles.menuActivo,
            ]}
          >
            Nueva tarea
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.opcionMenu}
          onPress={() => setPestañaActiva('enfoque')}
        >
          <Text
            style={[
              styles.iconoMenu,
              pestañaActiva === 'enfoque' && styles.menuActivo,
            ]}
          >
            ◷
          </Text>
          <Text
            style={[
              styles.textoMenu,
              pestañaActiva === 'enfoque' && styles.menuActivo,
            ]}
          >
            Enfoque
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- DICCIONARIO COMPLETO DE ESTILOS ---
const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F5F2F0',
    paddingTop: 50,
  },
  cabecera: {
    backgroundColor: '#FFF',
    padding: 15,
    marginHorizontal: 15,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  perfilFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarSq: {
    width: 40,
    height: 40,
    backgroundColor: '#7A5C43',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  usuarioTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2A1E',
  },
  motorVersion: {
    fontSize: 11,
    color: '#8A7A70',
    fontWeight: 'bold',
  },
  insigniaNivel: {
    marginLeft: 'auto',
    backgroundColor: '#3E2A1E',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  textoInsignia: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  barraProgresoContenedor: {
    height: 8,
    backgroundColor: '#E0DCD8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barraProgresoRelleno: {
    height: '100%',
  },
  progresoEtiquetas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  textoProgresoMin: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  textoProgresoMax: {
    fontSize: 10,
    color: '#8A7A70',
    fontWeight: 'bold',
  },
  tituloSeccionFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  tituloSeccion: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3E2A1E',
    letterSpacing: 0.5,
  },
  contadorMisiones: {
    backgroundColor: '#D1C4BC',
    color: '#3E2A1E',
    paddingHorizontal: 6,
    borderRadius: 10,
    fontSize: 12,
  },
  botonCargarPdf: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1C4BC',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  textoCargarPdf: {
    fontSize: 11,
    color: '#6E5D53',
    fontWeight: '500',
  },
  listaContenedor: {
    paddingHorizontal: 15,
    paddingBottom: 100,
    marginTop: 15,
  },
  contenedorVacio: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconoEspada: {
    fontSize: 50,
    marginBottom: 15,
  },
  textoVacioTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3E2A1E',
    marginBottom: 8,
  },
  textoVacioSub: {
    fontSize: 13,
    color: '#8A7A70',
    textAlign: 'center',
    lineHeight: 18,
  },
  tarjetaSimulacion: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    marginHorizontal: 15,
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1C4BC',
  },
  textoSimulacionTitulo: {
    fontSize: 22,
    fontWeight: '500',
    color: '#3E2A1E',
  },
  textoSimulacionExito: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  tarjetaMision: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#D1C4BC',
    elevation: 1,
  },
  etiquetaPrioridad: {
    position: 'absolute',
    top: 12,
    right: 15,
    backgroundColor: '#FFE6D1',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  textoPrioridad: {
    color: '#A87C5C',
    fontSize: 10,
    fontWeight: 'bold',
  },
  idMision: {
    fontSize: 11,
    color: '#8A7A70',
    marginBottom: 2,
    fontWeight: '500',
  },
  actividadTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3E2A1E',
    marginBottom: 10,
  },
  filaTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  tag: {
    backgroundColor: '#F0EAE5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  tagBono: {
    backgroundColor: '#FFF3E0',
  },
  tagTexto: {
    fontSize: 11,
    color: '#6E5D53',
    fontWeight: '500',
  },
  filaAccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0EAE5',
    paddingTop: 12,
  },
  puntajeLabel: {
    fontSize: 10,
    color: '#8A7A70',
    fontWeight: 'bold',
  },
  puntajeValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3E2A1E',
  },
  ptsUnidad: {
    fontSize: 14,
    color: '#8A7A70',
    fontWeight: 'normal',
  },
  tarjetaFormulario: {
    backgroundColor: '#D1C4BC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BCAFA5',
  },
  tarjetaFormularioVerde: {
    backgroundColor: '#C8E6C9',
    borderColor: '#81C784',
  },
  filaFormTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconoMasForm: {
    width: 30,
    height: 30,
    backgroundColor: '#3E2A1E',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tituloForm: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#3E2A1E',
  },
  subtituloForm: {
    fontSize: 11,
    color: '#6E5D53',
    width: '90%',
    marginTop: 2,
  },
  labelForm: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3E2A1E',
    marginTop: 12,
    marginBottom: 6,
  },
  inputForm: {
    backgroundColor: '#C4B5AC',
    borderRadius: 12,
    padding: 12,
    color: '#3E2A1E',
    borderWidth: 1,
    borderColor: '#BCAFA5',
  },
  inputFormFake: {
    backgroundColor: '#C4B5AC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BCAFA5',
    justifyContent: 'center',
    marginBottom: 10,
  },
  filaSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#C4B5AC',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  textoSwitch: {
    fontSize: 11,
    color: '#3E2A1E',
    width: '80%',
  },
  botonCalcular: {
    backgroundColor: '#7A5C43',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 25,
  },
  botonCalcularVerde: {
    backgroundColor: '#4CAF50',
  },
  textoBotonCalcular: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  menuInferior: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#1A110B',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  opcionMenu: {
    alignItems: 'center',
  },
  iconoMenu: {
    fontSize: 20,
    color: '#8A7A70',
  },
  textoMenu: {
    fontSize: 11,
    color: '#8A7A70',
    marginTop: 2,
  },
  menuActivo: {
    color: '#FFF3E0',
    fontWeight: 'bold',
  },
  botonEnfoque: {
    borderWidth: 1,
    borderColor: '#A87C5C',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  botonEnfoqueTexto: {
    color: '#A87C5C',
    fontWeight: 'bold',
    fontSize: 13,
  },
  tagSesionProductividad: {
    backgroundColor: '#3E2A1E',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  textoTagSesion: {
    color: '#D1C4BC',
    fontSize: 11,
    fontWeight: 'bold',
  },
  contenedorTextosEnfoque: {
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  tituloEnfoque: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2A1E',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtituloEnfoque: {
    fontSize: 12,
    color: '#6E5D53',
    textAlign: 'center',
  },
  fraseEnfoque: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3E2A1E',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  autorFrase: {
    fontSize: 12,
    color: '#6E5D53',
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  circuloReloj: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 8,
    borderColor: '#A89990',
    backgroundColor: 'transparent',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  circuloRelojActivo: {
    borderColor: '#5CFF26',
  },
  numerosReloj: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#3E2A1E',
    letterSpacing: 1,
  },
  etiquetaReloj: {
    fontSize: 10,
    color: '#8A7A70',
    letterSpacing: 2,
    marginTop: 2,
  },
  botonResetReloj: {
    backgroundColor: '#3E2A1E',
    width: '18%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonReset: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  botonCheck: {
    width: 36,
    height: 36,
    backgroundColor: '#FFE6D1',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  textoCheck: {
    color: '#A87C5C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filaBotonesReloj: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    width: '100%',
  },
  botonIniciarReloj: {
    marginTop: 0,
    width: '78%',
  },
});
