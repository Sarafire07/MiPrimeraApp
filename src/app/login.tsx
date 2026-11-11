import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Importamos correctamente el enrutador para el salto al panel
import { router } from 'expo-router';

export default function LoginScreen() {
  // Variables de estado (Como hacer usuario = "" en Python)
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [recordar, setRecordar] = useState(false);

  // Función de validación (Equivalente a 'def manejar_login():' en Python)
  const manejarLogin = () => {
    if (usuario.trim() === '' || contrasena.trim() === '') {
      Alert.alert("Error", "Por favor, completa todos los campos obligatorios.");
      return;
    }

    // Validación simulada de credenciales (Nivel 15)
    if (usuario.toLowerCase() === 'admin' && contrasena === '1234') {
      // Éxito: viaja directo al panel principal borrando el historial del login
      router.replace('/panel'); 
    } else {
      Alert.alert("Error de acceso", "El usuario o la contraseña son incorrectos.");
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

          <TouchableOpacity onPress={() => Alert.alert("Recuperar acceso", "Función de recuperación en desarrollo...")}>
            <Text style={styles.textoOpcionLink}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        {/* Botón Principal: Iniciar Sesión */}
        <TouchableOpacity style={styles.botonEntrar} onPress={manejarLogin}>
          <Text style={styles.textoBotonEntrar}>➔ Iniciar sesión</Text>
        </TouchableOpacity>

        {/* Botón Secundario: Crear Cuenta */}
        <TouchableOpacity style={styles.botonCrear} onPress={() => Alert.alert("Crear Cuenta", "Módulo de registro próximamente...")}>
          <Text style={styles.textoBotonCrear}>+ Crear cuenta</Text>
        </TouchableOpacity>
      </View>
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
});
