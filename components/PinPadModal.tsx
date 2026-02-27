/**
 * PinPadModal - Clavier de sécurité pour O'PIED DU MONT
 * Corrigé avec le bon chemin d'importation
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { supabase } from '../supabase'; // <-- Correction ici : on remonte d'un dossier

interface PinPadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (employeeName: string) => void;
}

export default function PinPadModal({ visible, onClose, onSuccess }: PinPadModalProps) {
  const [pin, setPin] = useState('');

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Si on atteint 4 chiffres, on vérifie automatiquement
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('employes')
        .select('nom')
        .eq('code_pin', code)
        .eq('actif', true)
        .single();

      if (error || !data) {
        Alert.alert('Erreur', 'Code PIN incorrect ou employé inactif');
        setPin(''); // On vide le PIN en cas d'erreur
      } else {
        onSuccess(data.nom);
        setPin(''); // On vide pour la prochaine fois
      }
    } catch (err) {
      Alert.alert('Erreur', 'Problème de connexion au serveur');
      setPin('');
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Identification Serveur</Text>
          
          {/* Indicateurs visuels du PIN (petits ronds) */}
          <View style={styles.dotsContainer}>
            {[1, 2, 3, 4].map((i) => (
              <View 
                key={i} 
                style={[styles.dot, { backgroundColor: pin.length >= i ? '#EAB308' : '#E2E8F0' }]} 
              />
            ))}
          </View>

          {/* Grille du pavé numérique */}
          <View style={styles.grid}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
              <TouchableOpacity
                key={btn}
                style={[
                  styles.button, 
                  (btn === 'C' || btn === '⌫') && { backgroundColor: '#f8fafc' }
                ]}
                onPress={() => {
                  if (btn === 'C') setPin('');
                  else if (btn === '⌫') handleDelete();
                  else handlePress(btn);
                }}
              >
                <Text style={[
                  styles.buttonText, 
                  (btn === 'C' || btn === '⌫') && { fontSize: 18, color: '#ef4444' }
                ]}>
                  {btn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  container: { 
    width: 320, 
    backgroundColor: 'white', 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 24,
    color: '#1e293b'
  },
  dotsContainer: { 
    flexDirection: 'row', 
    gap: 15, 
    marginBottom: 32 
  },
  dot: { 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    borderWidth: 2, 
    borderColor: '#cbd5e1' 
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center', 
    gap: 12 
  },
  button: { 
    width: 75, 
    height: 75, 
    borderRadius: 38, 
    backgroundColor: '#f1f5f9', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  buttonText: { 
    fontSize: 26, 
    fontWeight: '600',
    color: '#0f172a'
  },
  cancelBtn: { 
    marginTop: 24, 
    padding: 10 
  },
  cancelText: { 
    color: '#64748b', 
    fontWeight: '600', 
    fontSize: 16 
  }
});