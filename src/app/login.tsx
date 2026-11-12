import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

const RECORDAR_USUARIO_KEY = '@studyquest_nickname_guardado';


export default function LoginScreen() {
    const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Estados para pedir año de nacimiento al registrar
  const [modalRegistroVisible, setModalRegistroVisible] = useState(false);
  const [anioNacimiento, setAnioNacimiento] = useState('');

  // Estados para recuperar contraseña
  const [modalRecuperarVisible, setModalRecuperarVisible] = useState(false);
  const [nickRecuperar, setNickRecuperar] = useState('');
  const [anioRecuperar, setAnioRecuperar] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');

  // Cargar usuario si marcó "Recordar usuario"
  useEffect(() => {
    const cargarNickname = async () => {
      try {
        const guardado = await AsyncStorage.getItem(RECORDAR_USUARIO_KEY);
        if (guardado) {
          setUsuario(guardado);
          setRecordar(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    cargarNickname();
  }, []);

  const formatearNickname = (nick: string) => {
    const limpio = nick.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return `${limpio}@studyquest.app`;
  };

  const guardarPreferenciaRecordar = async (nick: string) => {
    if (recordar) {
      await AsyncStorage.setItem(RECORDAR_USUARIO_KEY, nick.trim());
    } else {
      await AsyncStorage.removeItem(RECORDAR_USUARIO_KEY);
    }
  };

  // --- INICIAR SESIÓN ---
  const manejarLogin = async () => {
    if (usuario.trim() === '' || contrasena.trim() === '') {
      Alert.alert('Error', 'Por favor, completa todos los campos obligatorios.');
      return;
    }

    setCargando(true);
    try {
      const nickLimpio = usuario.trim().toLowerCase();
      const emailInterno = formatearNickname(nickLimpio);

      // Revisar si restableció su clave con el año de nacimiento
      const q = query(
        collection(db, 'usuarios'),
        where('nickname', '==', nickLimpio)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const datosUsuario = snapshot.docs[0].data();
        if (
          datosUsuario.claveActualizada &&
          datosUsuario.claveActualizada === contrasena
        ) {
          await guardarPreferenciaRecordar(usuario);
          router.replace('/panel');
          return;
        }
      }

      await signInWithEmailAndPassword(auth, emailInterno, contrasena);
      await guardarPreferenciaRecordar(usuario);
      router.replace('/panel');
    } catch (error: any) {
      let mensaje = 'No se pudo iniciar sesión. Revisa tu conexión.';
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        mensaje = 'El usuario o la contraseña son incorrectos.';
      }
      Alert.alert('Error de acceso', mensaje);
    } finally {
      setCargando(false);
    }
  };

  // --- ABRIR VENTANA DE REGISTRO ---
  const abrirModalRegistro = () => {
    if (usuario.trim().length < 3) {
      Alert.alert(
        'Usuario muy corto',
        'Escribe primero un nickname de al menos 3 caracteres.'
      );
      return;
    }
    if (contrasena.length < 6) {
      Alert.alert(
        'Contraseña muy corta',
        'Escribe primero una contraseña de al menos 6 caracteres.'
      );
      return;
    }
    setAnioNacimiento('');
    setModalRegistroVisible(true);
  };

  // --- CREAR CUENTA CON AÑO DE NACIMIENTO ---
  const confirmarRegistro = async () => {
    const anioNum = parseInt(anioNacimiento.trim(), 10);
    const anioActual = new Date().getFullYear();

    if (
      anioNacimiento.trim().length !== 4 ||
      isNaN(anioNum) ||
      anioNum < 1900 ||
      anioNum > anioActual
    ) {
      Alert.alert(
        'Año inválido',
        `Ingresa un año de nacimiento válido (entre 1900 y ${anioActual}).`
      );
      return;
    }

    setModalRegistroVisible(false);
    setCargando(true);
    const nickLimpio = usuario.trim();

    try {
      const emailInterno = formatearNickname(nickLimpio);
      const credencial = await createUserWithEmailAndPassword(
        auth,
        emailInterno,
        contrasena
      );

      await setDoc(doc(db, 'usuarios', credencial.user.uid), {
        nickname: nickLimpio.toLowerCase(),
        anioNacimiento: anioNacimiento.trim(),
        creadoEn: new Date().toISOString(),
      });

      await guardarPreferenciaRecordar(nickLimpio);
      Alert.alert('¡Cuenta creada!', `Bienvenido a StudyQuest, ${nickLimpio}.`);
      router.replace('/panel');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Nickname ocupado',
          `El usuario "${nickLimpio}" ya existe. Por favor elige otro.`
        );
      } else {
        Alert.alert(
          'Error al registrar',
          'Verifica que tengas internet para crear tu cuenta.'
        );
      }
    } finally {
      setCargando(false);
    }
  };

  // --- RESTABLECER CONTRASEÑA ---
  const manejarRecuperacion = async () => {
    if (
      nickRecuperar.trim() === '' ||
      anioRecuperar.trim().length !== 4 ||
      nuevaContrasena.length < 6
    ) {
      Alert.alert(
        'Datos incompletos',
        'Ingresa tu usuario, tu año de nacimiento y una nueva contraseña de mínimo 6 caracteres.'
      );
      return;
    }

    setCargando(true);
    try {
      const nickBuscado = nickRecuperar.trim().toLowerCase();
      const q = query(
        collection(db, 'usuarios'),
        where('nickname', '==', nickBuscado)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert('No encontrado', 'Ese nombre de usuario no existe.');
        setCargando(false);
        return;
      }

      const docUsuario = snapshot.docs[0];
      const datos = docUsuario.data();

      if (datos.anioNacimiento !== anioRecuperar.trim()) {
        Alert.alert('Año incorrecto', 'El año de nacimiento no coincide.');
        setCargando(false);
        return;
      }

      await updateDoc(doc(db, 'usuarios', docUsuario.id), {
        claveActualizada: nuevaContrasena,
      });

      setModalRecuperarVisible(false);
      setUsuario(nickRecuperar.trim());
      setContrasena('');
      Alert.alert(
        '¡Contraseña restablecida!',
        'Ya puedes iniciar sesión con tu nueva contraseña.'
      );
    } catch (error) {
      Alert.alert('Error', 'Revisa tu conexión a internet.');
    } finally {
      setCargando(false);
    }
  };


  return (
    <View style={styles.contenedor}>
      {/* Título de bienvenida superior */}
      <Text style={styles.bienvenida}>¡Bienvenido!</Text>

      {/* Tarjeta contenedora principal */}
      <View style={styles.tarjeta}>
        <Text style={styles.tituloTarjeta}>Iniciar sesión</Text>
        <Text style={styles.subtituloTarjeta}>
          Usa tu usuario y contraseña para acceder a tus misiones, progreso y sesiones de enfoque.
        </Text>

        {/* Entrada de texto: Usuario */}
        <Text style={styles.label}>USUARIO *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Tu usuario" 
          placeholderTextColor="#8A7A70"
          value={usuario}
          onChangeText={setUsuario} 
        />

        {/* Entrada de texto: Contraseña */}
        <Text style={styles.label}>CONTRASEÑA *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="••••••••" 
          secureTextEntry={true} 
          placeholderTextColor="#8A7A70"
          value={contrasena}
          onChangeText={setContrasena}
        />

        {/* Fila interactiva: Recordar usuario y Olvidaste tu contraseña */}
        <View style={styles.filaOpciones}>
          <Pressable style={styles.casillaContenedor} onPress={() => setRecordar(!recordar)}>
            <View style={[styles.casilla, recordar && styles.casillaMarcada]}>
              {recordar && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={styles.textoOpcion}>Recordar usuario</Text>
          </Pressable>

                    <TouchableOpacity
            onPress={() => {
              setNickRecuperar(usuario);
              setAnioRecuperar('');
              setNuevaContrasena('');
              setModalRecuperarVisible(true);
            }}
          >
            <Text style={styles.textoOpcionLink}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

        </View>

        {/* Botón Principal: Iniciar Sesión */}
        <TouchableOpacity style={styles.botonEntrar} onPress={manejarLogin}>
          <Text style={styles.textoBotonEntrar}>➔ Iniciar sesión</Text>
        </TouchableOpacity>

        {/* Botón Secundario: Crear Cuenta */}
        <TouchableOpacity style={styles.botonCrear} onPress={abrirModalRegistro}>
          <Text style={styles.textoBotonCrear}>+ Crear cuenta</Text>
        </TouchableOpacity>

      </View>
            {/* MODAL 1: AÑO DE NACIMIENTO AL REGISTRARSE */}
      <Modal visible={modalRegistroVisible} transparent={true} animationType="fade">
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <Text style={styles.tituloTarjeta}>Pregunta de seguridad</Text>
            <Text style={styles.subtituloTarjeta}>
              Usaremos tu año de nacimiento por si algún día olvidas tu contraseña.
            </Text>
            <Text style={styles.label}>AÑO DE NACIMIENTO (4 DÍGITOS) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 2003"
              placeholderTextColor="#8A7A70"
              keyboardType="numeric"
              maxLength={4}
              value={anioNacimiento}
              onChangeText={setAnioNacimiento}
            />
            <TouchableOpacity style={styles.botonEntrar} onPress={confirmarRegistro}>
              <Text style={styles.textoBotonEntrar}>Guardar y Crear Cuenta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botonCrear}
              onPress={() => setModalRegistroVisible(false)}
            >
              <Text style={styles.textoBotonCrear}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: RECUPERAR CONTRASEÑA */}
      <Modal visible={modalRecuperarVisible} transparent={true} animationType="fade">
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <Text style={styles.tituloTarjeta}>Recuperar contraseña</Text>
            <Text style={styles.subtituloTarjeta}>
              Ingresa tu nickname y tu año de nacimiento para crear una clave nueva.
            </Text>
            <Text style={styles.label}>USUARIO *</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu usuario"
              placeholderTextColor="#8A7A70"
              autoCapitalize="none"
              value={nickRecuperar}
              onChangeText={setNickRecuperar}
            />
            <Text style={styles.label}>AÑO DE NACIMIENTO *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 2003"
              placeholderTextColor="#8A7A70"
              keyboardType="numeric"
              maxLength={4}
              value={anioRecuperar}
              onChangeText={setAnioRecuperar}
            />
            <Text style={styles.label}>NUEVA CONTRASEÑA *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#8A7A70"
              secureTextEntry={true}
              value={nuevaContrasena}
              onChangeText={setNuevaContrasena}
            />
            <TouchableOpacity style={styles.botonEntrar} onPress={manejarRecuperacion}>
              <Text style={styles.textoBotonEntrar}>Cambiar contraseña</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botonCrear}
              onPress={() => setModalRecuperarVisible(false)}
            >
              <Text style={styles.textoBotonCrear}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F5F2F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  bienvenida: {
    fontSize: 38,
    color: '#8A7A70',
    marginBottom: 20,
    alignSelf: 'flex-start',
    marginLeft: 5,
  },
  tarjeta: {
    backgroundColor: '#D1C4BC',
    width: '100%',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: '#BCAFA5',
  },
  tituloTarjeta: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3E2A1E',
    marginBottom: 5,
  },
  subtituloTarjeta: {
    fontSize: 13,
    color: '#6E5D53',
    marginBottom: 20,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3E2A1E',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#C4B5AC',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#3E2A1E',
    borderWidth: 1,
    borderColor: '#BCAFA5',
    marginBottom: 10,
  },
  filaOpciones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  casillaContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  casilla: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#3E2A1E',
    borderRadius: 4,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  casillaMarcada: {
    backgroundColor: '#7A5C43',
  },
  check: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  textoOpcion: {
    fontSize: 12,
    color: '#3E2A1E',
  },
  textoOpcionLink: {
    fontSize: 12,
    color: '#3E2A1E',
    textDecorationLine: 'underline',
  },
  botonEntrar: {
    backgroundColor: '#7A5C43',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  textoBotonEntrar: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  botonCrear: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7A5C43',
    marginTop: 12,
  },
  textoBotonCrear: {
    color: '#7A5C43',
    fontWeight: 'bold',
    fontSize: 16,
  },
    modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(26, 17, 11, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalTarjeta: {
    backgroundColor: '#D1C4BC',
    width: '100%',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: '#BCAFA5',
  },

});
