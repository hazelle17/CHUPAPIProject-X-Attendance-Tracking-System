import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config/apiConfig';

const IntegratedLoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [useStudentId, setUseStudentId] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      let endpoint = '';
      let payload = {};

      switch (selectedRole) {
        case 'student':
          endpoint = '/api/auth/student/login';
          if (useStudentId) {
            payload = {
              studentId: identifier,
              password
            };
          } else {
            payload = {
              email: identifier,
              password
            };
          }
          break;
        case 'lecturer':
          endpoint = '/api/auth/lecturer/login';
          // For lecturer, check if identifier looks like an email
          if (identifier.includes('@')) {
            payload = {
              email: identifier,
              password
            };
          } else {
            payload = {
              username: identifier,
              password
            };
          }
          break;
        case 'admin':
          endpoint = '/api/auth/admin/login';
          // For admin, check if identifier looks like an email
          if (identifier.includes('@')) {
            payload = {
              email: identifier,
              password
            };
          } else {
            payload = {
              username: identifier,
              password
            };
          }
          break;
      }

      console.log('Attempting login with:', {
        role: selectedRole,
        endpoint: `${API_BASE_URL}${endpoint}`,
        payload: { ...payload, password: '***' }
      });

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Server response:', {
        status: response.status,
        data: data
      });

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store the token and user data
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      await AsyncStorage.setItem('userRole', selectedRole);

      // Navigate based on role
      switch (selectedRole) {
        case 'student':
          router.replace('/(student)/dashboard');
          break;
        case 'lecturer':
          router.replace('/(lecturer)/dashboard');
          break;
        case 'admin':
          router.replace('/(admin)/dashboard');
          break;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'An error occurred during login. Please check your network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getIdentifierLabel = () => {
    switch (selectedRole) {
      case 'student':
        return useStudentId ? 'Student ID' : 'Email Address';
      case 'lecturer':
        return 'Email Address';
      case 'admin':
        return 'Username';
      default:
        return 'Email Address';
    }
  };

  return (
    <LinearGradient
      colors={['#FF6B6B', '#FF8E53', '#FF6B6B']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text key="project-title" style={styles.title}>{`PROJECT\nX`}</Text>
          <Text key="project-subtitle" style={styles.subtitle}> ATTENDANCE RECORD SYSTEM</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.signInText}>Please sign in to continue</Text>

          <View style={styles.roleSelector}>
            <Text style={styles.label}>Select Role</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedRole}
                onValueChange={(itemValue) => setSelectedRole(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Student" value="student" />
                <Picker.Item label="Lecturer" value="lecturer" />
                <Picker.Item label="Administrator" value="admin" />
              </Picker>
            </View>
          </View>

          {selectedRole === 'student' && (
            <View style={styles.loginTypeContainer}>
              <Text style={styles.loginTypeText}>Login with Student ID</Text>
              <Switch
                value={useStudentId}
                onValueChange={setUseStudentId}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={useStudentId ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{getIdentifierLabel()}</Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter your ${getIdentifierLabel().toLowerCase()}`}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType={selectedRole === 'student' && !useStudentId ? 'email-address' : 'default'}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signInButton} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 80 : 60,
    marginBottom: Platform.OS === 'web' ? 50 : 40,
  },
  title: {
    color: 'white',
    fontSize: Platform.OS === 'web' ? 42 : 36,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 52 : 44,
    letterSpacing: 1,
    ...(Platform.OS === 'web' && {
      whiteSpace: 'pre-line',
      userSelect: 'none',
    }),
  },
  subtitle: {
    color: 'white',
    fontSize: Platform.OS === 'web' ? 20 : 18,
    marginTop: 10,
    letterSpacing: 0.5,
    fontWeight: '500',
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
    }),
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  signInText: {
    color: '#666',
    marginBottom: 20,
  },
  roleSelector: {
    marginBottom: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 8,
  },
  picker: {
    height: 50,
  },
  loginTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  loginTypeText: {
    fontSize: 14,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  forgotPassword: {
    color: '#4CAF50',
    textAlign: 'right',
    marginTop: 10,
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default IntegratedLoginScreen; 