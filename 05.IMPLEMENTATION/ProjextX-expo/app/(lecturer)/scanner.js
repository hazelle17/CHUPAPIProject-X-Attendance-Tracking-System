import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Platform, Image, ActivityIndicator, Alert, ScrollView, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImagePlaceholder from '../../components/ImagePlaceholder';
import WebCameraScanner from '../../components/WebCameraScanner';
import API_BASE_URL from '../../config/apiConfig';

export default function WebQRScannerScreen() {
  const [scanResult, setScanResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'demo'
  const [currentClass, setCurrentClass] = useState(null);
  const [scannedStudents, setScannedStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({ total: 0, present: 0 });
  const [lecturerData, setLecturerData] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateStudentInfo, setDuplicateStudentInfo] = useState(null);
  const fileInputRef = useRef(null);
  
  // Get current class data from route params
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get user token for API requests
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setUserToken(token);
        }
        
        // Get current class data if available
        const classData = await AsyncStorage.getItem('currentClass');
        if (classData) {
          const parsedClassData = JSON.parse(classData);
          console.log('Retrieved class data from AsyncStorage:', parsedClassData);
          setCurrentClass(parsedClassData);
        } else {
          console.warn('No class data found in AsyncStorage');
        }
        
        // Get lecturer data if available
        const lecturerDataStr = await AsyncStorage.getItem('lecturerData');
        if (lecturerDataStr) {
          const parsedLecturerData = JSON.parse(lecturerDataStr);
          console.log('Retrieved lecturer data from AsyncStorage:', parsedLecturerData);
          setLecturerData(parsedLecturerData);
        } else {
          // Fallback to userData if lecturerData is not available
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const parsedUserData = JSON.parse(userData);
            console.log('Using userData as fallback for lecturer data:', parsedUserData);
            setLecturerData(parsedUserData);
          } else {
            console.warn('No lecturer data found in AsyncStorage');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, []);
  
  // Load jsQR library for QR code scanning
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if jsQR is already loaded
      if (!window.jsQR) {
        // Create script element to load jsQR
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
        script.async = true;
        script.onload = () => console.log('jsQR loaded successfully');
        script.onerror = () => console.error('Failed to load jsQR');
        document.body.appendChild(script);
      }
    }
  }, []);

  // Function to close the result modal
  const closeModal = () => {
    setShowResultModal(false);
  };
  
  // Function to trigger file input click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Process the scanned QR code data and record attendance
  const processQRCodeData = async (qrData) => {
    try {
      console.log('Processing QR code data:', qrData);
      
      let studentData = null;
      
      try {
        // Log the raw QR data for debugging
        console.log('Raw QR data:', qrData);
        
        if (typeof qrData === 'string') {
          // Remove any non-printable characters, BOM, or other potential issues
          const cleanedData = qrData.trim().replace(/^\ufeff/g, '');
          
          console.log('Cleaned QR data:', cleanedData);
          
          // STRICT VALIDATION: Only accept the pipe-delimited format (studentID|name|email)
          const pipeDelimitedRegex = /^([^|]+)\|([^|]+)\|([^|]+)$/;
          const pipeMatch = cleanedData.match(pipeDelimitedRegex);
          
          if (pipeMatch) {
            // This is the expected format: studentID|name|email
            const [_, studentId, name, email] = pipeMatch;
            studentData = {
              studentId,
              name,
              email
            };
            console.log('Successfully parsed pipe-delimited data:', studentData);
          } else {
            // STRICT ENFORCEMENT: Reject QR codes that don't match the expected format
            console.error('QR code does not match the expected format (studentID|name|email)');
            
            // Show custom error modal instead of Alert
            setErrorMessage('This QR code does not have the required format:\n\nstudentID|name|email\n\nATTENDANCE NOT RECORDED.');
            setShowErrorModal(true);
            
            // Play a sound or vibration to indicate error (if available)
            try {
              if (Platform.OS === 'ios' || Platform.OS === 'android') {
                // Vibrate the device if possible
                if (Vibration) {
                  Vibration.vibrate(500);
                }
              }
            } catch (e) {
              console.log('Vibration not available:', e);
            }
            
            // Return null to indicate that the QR code was rejected
            return null;
          }
        } else if (typeof qrData === 'object') {
          // Already an object
          studentData = qrData;
          console.log('QR data is already an object:', studentData);
        } else {
          throw new Error('QR data is neither string nor object');
        }
        
        // Ensure we have the minimum required data
        if (!studentData.studentId) {
          console.error('No studentId found in parsed data');
          throw new Error('Missing student ID in QR code data');
        }
      } catch (error) {
        console.error('Error parsing QR code data:', error);
        Alert.alert('Invalid QR Code', 'The scanned QR code is not in the correct format. Please ensure you are scanning a valid student QR code.');
        return null;
      }
      
      console.log('Scanned student data:', studentData);
      
      // Check if this is a student QR code
      if (!studentData.studentId) {
        // This might be a class QR code or something else
        return studentData;
      }
      
      // Check if this student has already been scanned
      const existingStudent = scannedStudents.find(item => item.studentId === studentData.studentId);
      if (existingStudent) {
        // Get the time when the student was previously scanned
        const previousScanTime = existingStudent.timestamp ? 
          new Date(existingStudent.timestamp).toLocaleTimeString() : 
          'earlier today';
        
        console.log('Student already scanned:', studentData.studentId, 'at', previousScanTime);
        
        // Set duplicate student info for the modal
        setDuplicateStudentInfo({
          ...existingStudent,
          previousScanTime
        });
        
        // Show the duplicate scan modal
        setShowDuplicateModal(true);
        
        // Vibrate the device if possible to provide feedback
        try {
          if (Vibration) {
            Vibration.vibrate([100, 100, 100]); // Pattern: vibrate, pause, vibrate, pause, vibrate
          }
        } catch (e) {
          console.log('Vibration not available:', e);
        }
        
        return studentData;
      }
      
      // Get user token for API authentication
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (userToken && currentClass) {
        try {
          // First try to get the specific lecturer data stored for attendance
          let lecturerDataStr = await AsyncStorage.getItem('lecturerData');
          
          // If no specific lecturer data, fall back to the user data
          if (!lecturerDataStr) {
            console.log('No specific lecturer data found, falling back to userData');
            lecturerDataStr = await AsyncStorage.getItem('userData');
          }
          
          const lecturer = lecturerDataStr ? JSON.parse(lecturerDataStr) : {};
          
          // If the lecturer data contains the original data, use that
          const effectiveLecturer = lecturer.originalData || lecturer;
          
          console.log('Retrieved lecturer data for attendance:', effectiveLecturer);
          
          // Record attendance in the API with comprehensive details
          const attendanceData = {
            studentId: studentData.studentId,
            studentName: studentData.name || 'Unknown Student',
            // Use class data from AsyncStorage
            courseCode: currentClass?.courseCode || 'Unknown Course',
            courseName: currentClass?.courseName || 'Unknown Course',
            section: currentClass?.section || 'N/A',
            room: currentClass?.room || 'N/A',
            schedule: currentClass?.schedule || 'N/A',
            // Use the effective lecturer data from AsyncStorage - ensure we have valid lecturer info
            lecturerId: effectiveLecturer?.lecturerId || effectiveLecturer?._id || effectiveLecturer?.id || 'L001', // Default ID if none available
            lecturerName: effectiveLecturer?.name || effectiveLecturer?.fullName || 'Default Lecturer', // Default name if none available
            // Add current date and time
            date: new Date(),
            status: 'present',
            timestamp: Date.now()
          };
          
          // Log lecturer information for debugging
          console.log('Using lecturer information for attendance:', {
            lecturerId: attendanceData.lecturerId,
            lecturerName: attendanceData.lecturerName,
            source: effectiveLecturer
          });
          
          // If we have a class ID, add it to the attendance data
          if (currentClass?._id) {
            attendanceData.classId = currentClass._id;
          } else if (currentClass?.id) {
            attendanceData.classId = currentClass.id;
          }
          
          // For debugging - log the current class data and attendance data
          console.log('Current class data for attendance:', currentClass);
          console.log('Current lecturer data for attendance:', effectiveLecturer);
          console.log('Final attendance data being sent:', attendanceData);
          
          // Log the API endpoint and data being sent
          console.log('API Endpoint:', `${API_BASE_URL}/api/attendance/record`);
          console.log('Sending attendance data:', JSON.stringify(attendanceData, null, 2));
          console.log('Auth token available:', !!userToken);
          
          try {
            // Format the date properly to avoid timezone issues
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            attendanceData.date = today;
            
            // Add a timestamp-based unique identifier to ensure uniqueness
            attendanceData.uniqueId = `${attendanceData.studentId}_${attendanceData.courseCode}_${Date.now()}`;
            
            // Use the direct IP address from the logs that was successful
            const directEndpoint = 'http://192.168.135.120:5000/api/attendance/record';
            console.log(`Sending attendance data directly to: ${directEndpoint}`);
            
            // Make the direct API request
            const attendanceResponse = await fetch(directEndpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(attendanceData)
            });
            
            // Get the response text
            const responseText = await attendanceResponse.text();
            console.log(`Response from ${directEndpoint}:`, responseText);
            
            console.log('Response status:', attendanceResponse.status);
            
            // Log the response text for debugging
            console.log('Response text:', responseText);
            
            // Try to parse the response as JSON if possible
            let responseData;
            try {
              responseData = JSON.parse(responseText);
              console.log('Response data:', responseData);
            } catch (jsonError) {
              console.log('Response is not valid JSON');
            }
            
            if (attendanceResponse.ok) {
              console.log('Attendance recorded successfully');
              
              // Add the student to scanned students with comprehensive details
              const attendanceRecord = {
                ...studentData,
                courseCode: currentClass.courseCode,
                courseName: currentClass.courseName,
                section: currentClass.section,
                room: currentClass.room,
                schedule: currentClass.schedule,
                lecturerName: lecturer.name || lecturer.fullName,
                timestamp: new Date().toISOString(),
                status: 'present'
              };
              
              // Add to scanned students list
              setScannedStudents([...scannedStudents, attendanceRecord]);
              
              // Show success message with details
              Alert.alert(
                'Attendance Recorded',
                `Student: ${studentData.name || studentData.studentId}\nID: ${studentData.studentId}\nClass: ${currentClass.courseCode} - ${currentClass.section}\nTime: ${new Date().toLocaleTimeString()}`,
                [{ text: 'OK' }]
              );
            } else {
              console.log('Failed to record attendance:', attendanceResponse.status);
              console.log('Error details:', responseText);
              
              // Show error with more details
              Alert.alert(
                'API Connection Issue',
                `Could not save attendance to the server (Status: ${attendanceResponse.status}).\n\nError: ${responseData?.message || responseText || 'Unknown error'}\n\nThe record will be stored locally.`,
                [{ text: 'OK' }]
              );
              
              // Still add to local scanned students list
              setScannedStudents([...scannedStudents, studentData]);
            }
          } catch (fetchError) {
            console.error('Network error when recording attendance:', fetchError);
            Alert.alert(
              'Network Error',
              `Could not connect to the server: ${fetchError.message}\n\nThe record will be stored locally.`,
              [{ text: 'OK' }]
            );
            
            // Still add to local scanned students list
            setScannedStudents([...scannedStudents, studentData]);
          }
        } catch (apiError) {
          console.error('Error recording attendance in API:', apiError);
          // Continue anyway since we're storing locally
        }
      } else if (!currentClass) {
        Alert.alert(
          'No Class Selected', 
          'Please select a class before scanning student QR codes.',
          [{ text: 'OK', onPress: () => router.push('/(lecturer)/dashboard') }]
        );
        return studentData;
      }
      
      // Add the scanned student to our local list
      const updatedScannedStudents = [...scannedStudents, studentData];
      setScannedStudents(updatedScannedStudents);
      
      // Update attendance status
      setAttendanceStatus(prev => ({
        ...prev,
        present: updatedScannedStudents.length
      }));
      
      // Save attendance data to AsyncStorage
      if (currentClass) {
        try {
          const attendanceKey = `attendance_${currentClass.id}_${new Date().toISOString().split('T')[0]}`;
          await AsyncStorage.setItem(attendanceKey, JSON.stringify(updatedScannedStudents));
        } catch (storageError) {
          console.error('Error saving attendance data:', storageError);
        }
      }
      
      return studentData;
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', 'Failed to process the QR code data.');
      return null;
    }
  };
  
  // Function to handle file selection
  const handleFileChange = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      setIsLoading(true);
      
      // Create form data for the API request
      const formData = new FormData();
      formData.append('file', file);
      
      // Make the API request to the QR Server
      try {
        const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the API response
        if (data && data.length > 0 && data[0].symbol && data[0].symbol.length > 0) {
          const qrData = data[0].symbol[0];
          
          if (qrData.error) {
            // QR code not found or error in scanning
            Alert.alert('Scan Failed', 'No QR code found in the image or the QR code could not be read.');
          } else {
            // Successfully scanned QR code
            const result = {
              type: 'qr',
              data: qrData.data
            };
            
            // Process the QR code data for attendance
            const processedData = await processQRCodeData(qrData.data);
            
            if (processedData) {
              // Add to scan history
              setScanHistory([result, ...scanHistory.slice(0, 9)]);
              
              // Set result and show modal
              setScanResult(result);
              setShowResultModal(true);
            }
          }
        } else {
          Alert.alert('Scan Failed', 'Failed to process the QR code. Please try a different image.');
        }
      } catch (error) {
        console.error('Error scanning QR code:', error);
        Alert.alert('Error', 'Failed to scan the QR code. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error handling file:', error);
      Alert.alert('Error', 'Failed to process the image. Please try again.');
    }
  };

  // Generate a demo QR code scan result
  const generateDemoScan = async (type = 'student') => {
    let demoData;
    
    if (type === 'student') {
      // Create demo student data
      demoData = {
        studentId: 'STU' + Math.floor(100000 + Math.random() * 900000),
        name: 'Demo Student',
        program: 'Computer Science',
        year: Math.floor(1 + Math.random() * 4)
      };
    } else if (type === 'class') {
      // Create demo class data
      demoData = {
        classId: 'CLS' + Math.floor(10000 + Math.random() * 90000),
        courseCode: 'CS' + Math.floor(100 + Math.random() * 900),
        courseName: 'Introduction to Programming',
        section: String.fromCharCode(65 + Math.floor(Math.random() * 3)), // A, B, or C
        room: 'Room ' + Math.floor(100 + Math.random() * 300),
        time: '10:00 AM - 12:00 PM'
      };
      
      // If this is a class QR code, set it as the current class
      setCurrentClass(demoData);
      await AsyncStorage.setItem('currentClassData', JSON.stringify(demoData));
      Alert.alert('Class Selected', `Selected class: ${demoData.courseCode} - ${demoData.courseName}`);
    }
    
    const result = {
      type: 'qr',
      data: JSON.stringify(demoData)
    };
    
    // Process the QR code data for attendance if it's a student
    if (type === 'student') {
      const processedData = await processQRCodeData(demoData);
      if (processedData) {
        // Add to scan history
        setScanHistory([result, ...scanHistory.slice(0, 9)]);
        
        // Set result and show modal
        setScanResult(result);
        setShowResultModal(true);
      }
    } else {
      // For class QR codes, just show the modal
      setScanHistory([result, ...scanHistory.slice(0, 9)]);
      setScanResult(result);
      setShowResultModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button and mode toggle */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>QR Scanner</Text>
        
        <TouchableOpacity 
          style={[styles.modeToggle, scanMode === 'demo' && styles.modeToggleActive]}
          onPress={() => setScanMode(scanMode === 'camera' ? 'demo' : 'camera')}
        >
          <Ionicons 
            name={scanMode === 'camera' ? 'flask-outline' : 'camera-outline'} 
            size={20} 
            color={scanMode === 'demo' ? '#fff' : '#000'} 
          />
          <Text style={[styles.modeToggleText, scanMode === 'demo' && styles.modeToggleTextActive]}>
            {scanMode === 'camera' ? 'Demo Mode' : 'Camera Mode'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {scanMode === 'camera' ? (
        <View style={styles.cameraContainer}>
          {currentClass && (
            <View style={styles.classInfoBanner}>
              <Text style={styles.classInfoText}>
                Class: {currentClass.courseCode} - {currentClass.section} | 
                Attendance: {scannedStudents.length} present
              </Text>
            </View>
          )}
          
          <WebCameraScanner onScan={async (result) => {
            try {
              console.log('Raw scan result:', result);
              
              // Ensure we have valid data before processing
              if (!result || !result.data) {
                console.error('Invalid scan result:', result);
                Alert.alert('Invalid QR Code', 'The scanned QR code did not contain valid data.');
                return;
              }
              
              // Process the QR code data for attendance
              const processedData = await processQRCodeData(result.data);
              console.log('Processed QR data:', processedData);
              
              if (processedData) {
                // Add to scan history
                setScanHistory([result, ...scanHistory.slice(0, 9)]);
                
                // Set result and show modal
                setScanResult(result);
                setShowResultModal(true);
                
                // Show success message
                Alert.alert(
                  'Attendance Recorded', 
                  `Successfully recorded attendance for ${processedData.name || processedData.studentId}`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error processing scan result:', error);
              Alert.alert('Scan Error', 'There was an error processing the QR code. Please try again.');
            }
          }} />
        </View>
      ) : (
        <View style={styles.demoContainer}>
          <Text style={styles.demoTitle}>Demo QR Scanner</Text>
          <Text style={styles.demoDescription}>
            This is a demo mode that simulates QR code scanning.
            You can upload an image containing a QR code or use the demo buttons below.
          </Text>
          
          <View style={styles.demoQrContainer}>
            <ImagePlaceholder
              width={250}
              height={250}
              isQRCode={true}
              text="Upload QR Code"
              style={styles.qrPlaceholder}
            />
          </View>
          
          {/* Hidden file input for web */}
          {Platform.OS === 'web' && (
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
          )}
          
          <View style={styles.uploadButtonContainer}>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={handleUploadClick}
            >
              <Ionicons name="image-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.scanButtonText}>Upload QR Image</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <Text style={styles.sectionTitle}>Generate Demo QR</Text>
          <Text style={styles.sectionDescription}>
            No QR code image? Try our demo mode to simulate scanning.
          </Text>
          
          <View style={styles.demoButtonsContainer}>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={() => generateDemoScan('student')}
            >
              <Ionicons name="person-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.scanButtonText}>Scan Student QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.scanButton, styles.classButton]}
              onPress={() => generateDemoScan('class')}
            >
              <Ionicons name="school-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.scanButtonText}>Scan Class QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Scan History */}
      {scanHistory.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          <View style={styles.historyList}>
            {scanHistory.slice(0, 3).map((item, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.historyItem}
                onPress={() => {
                  setScanResult(item);
                  setShowResultModal(true);
                }}
              >
                <Ionicons name="qr-code-outline" size={16} color="#1B3358" />
                <Text style={styles.historyText} numberOfLines={1} ellipsizeMode="tail">
                  {typeof item.data === 'string' && item.data.startsWith('{') 
                    ? JSON.parse(item.data).name || JSON.parse(item.data).courseName || 'QR Code'
                    : item.data.substring(0, 20) + (item.data.length > 20 ? '...' : '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1B3358" />
          <Text style={styles.loadingText}>Scanning QR Code...</Text>
        </View>
      )}

      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>QR Code Scanned</Text>
            
            {scanResult && (
              <>
                <Text style={styles.resultLabel}>Type:</Text>
                <Text style={styles.resultValue}>{scanResult.type}</Text>
                
                <Text style={styles.resultLabel}>Data:</Text>
                <Text style={styles.resultValue}>
                  {typeof scanResult.data === 'string' && scanResult.data.startsWith('{') 
                    ? JSON.stringify(JSON.parse(scanResult.data), null, 2) 
                    : scanResult.data}
                </Text>
              </>
            )}
            
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Custom Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModalContent}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={60} color="#FF3B30" />
            </View>
            
            <Text style={styles.errorModalTitle}>INVALID QR CODE FORMAT</Text>
            
            <Text style={styles.errorModalMessage}>
              {errorMessage}
            </Text>
            
            <TouchableOpacity 
              style={styles.errorCloseButton} 
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorCloseButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Duplicate Student Scan Modal */}
      <Modal
        visible={showDuplicateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDuplicateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.duplicateModalContent}>
            <View style={styles.duplicateIconContainer}>
              <Ionicons name="information-circle" size={60} color="#007AFF" />
            </View>
            
            <Text style={styles.duplicateModalTitle}>ALREADY SCANNED</Text>
            
            <Text style={styles.duplicateModalMessage}>
              {duplicateStudentInfo ? 
                `${duplicateStudentInfo.name || 'This student'} (ID: ${duplicateStudentInfo.studentId}) has already been marked present at ${duplicateStudentInfo.previousScanTime}.\n\nDUPLICATE ATTENDANCE NOT RECORDED.` : 
                'This student has already been scanned and marked present.\n\nDUPLICATE ATTENDANCE NOT RECORDED.'}
            </Text>
            
            <TouchableOpacity 
              style={styles.duplicateCloseButton} 
              onPress={() => setShowDuplicateModal(false)}
            >
              <Text style={styles.duplicateCloseButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  modeToggleActive: {
    backgroundColor: '#1B3358',
  },
  modeToggleText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#000',
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  classInfoBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(27, 51, 88, 0.8)',
    padding: 10,
    zIndex: 5,
  },
  classInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  demoContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  demoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1B3358',
  },
  demoDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    maxWidth: 500,
  },
  demoQrContainer: {
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  selectedImage: {
    width: 250,
    height: 250,
    borderRadius: 10,
  },
  qrPlaceholder: {
    borderWidth: 0,
    backgroundColor: '#fff',
  },
  uploadButtonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
      },
    }),
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3358',
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginTop: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  demoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 10,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
      },
    }),
  },
  classButton: {
    backgroundColor: '#4CAF50',
  },
  buttonIcon: {
    marginRight: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historySection: {
    width: '100%',
    maxWidth: 500,
    marginTop: 20,
  },
  historyList: {
    width: '100%',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  historyText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1B3358',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  errorModalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
      },
    }),
  },
  errorIconContainer: {
    marginBottom: 15,
  },
  errorModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  errorCloseButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  errorCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  // Duplicate Student Scan Modal Styles
  duplicateModalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
      },
    }),
  },
  duplicateIconContainer: {
    marginBottom: 15,
  },
  duplicateModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  duplicateModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  duplicateCloseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  duplicateCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  resultValue: {
    fontSize: 16,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    width: '100%',
  },
  closeButton: {
    backgroundColor: '#000',
    borderRadius: 5,
    padding: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
