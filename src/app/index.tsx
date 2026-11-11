import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// 1. Importamos el enrutador de Expo
import { router } from 'expo-router';

export default function HomeScreen() {
  
  // 2. Modificamos la función para que redirija a la pantalla 'login'
  const manejarInicio = () => {
    router.push('/login'); 
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>STUDYQUEST</Text>

      <TouchableOpacity style={styles.boton} onPress={manejarInicio}>
        <Text style={styles.textoBoton}>Inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#000000',
    marginBottom: 30,
  },
  boton: {
    backgroundColor: '#A87C5C',
    paddingVertical: 12,
    paddingHorizontal: 45,
    borderRadius: 12,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
