/**
 * PinPadModal - Clavier de sécurité pour O'PIED DU MONT
 * Version optimisée : Identification locale via AppContext et thématisation complète.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
// @ts-ignore
import { useApp } from '../app-context';
// @ts-ignore
import { useColors } from '../hooks/use-colors';

interface PinPadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (employeeName: string) => void;
}

export default function PinPadModal({ visible, onClose, onSuccess }: PinPadModalProps) {
  const [pin, setPin] = useState('');
  const { state } = useApp();
  const colors = useColors();

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Si on atteint 4 chiffres, on vérifie localement
      if (newPin.length === 4) {
        verifyPinLocally(newPin);
      }
    }
  };

  /**
   * Vérification ultra-rapide dans la liste des employés chargée au démarrage
   */
  const verifyPinLocally = (code: string) => {
    // Note : Dans votre base SQL, assurez-vous que la colonne est 'code_pin'
    // Ici on simule la recherche sur le state global
    const employee = state.employees.find((emp: any) => emp.code_pin === code && emp.est_actif);

    if (employee) {
      onSuccess(employee.nom);
      setPin('');
    } else {
      Alert.alert('Accès Refusé', 'Code PIN incorrect ou employé non autorisé.');
      setPin('');
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Identification Serveur</Text>
          
          {/* Indicateurs visuels du PIN */}
          <View style={styles.dotsContainer}>
            {[1, 2, 3, 4].map((i) => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  { 
                    backgroundColor: pin.length >= i ? colors.primary : 'transparent',
                    borderColor: colors.border
                  }
                ]} 
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
                  { backgroundColor: colors.background },
                  (btn === 'C' || btn === '⌫') && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
                ]}
                onPress={() => {
                  if (btn === 'C') setPin('');
                  else if (btn === '⌫') handleDelete();
                  else handlePress(btn);
                }}
              >
                <Text style={[
                  styles.buttonText, 
                  { color: colors.foreground },
                  (btn === 'C' || btn === '⌫') && { fontSize: 18, color: colors.error }
                ]}>
                  {btn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.muted }]}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  container: { 
    width: 320, 
    borderRadius: 32, 
    padding: 24, 
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15
  },
  title: { 
    fontSize: 22, 
    fontWeight: '900', 
    marginBottom: 24,
    letterSpacing: 0.5
  },
  dotsContainer: { 
    flexDirection: 'row', 
    gap: 20, 
    marginBottom: 40 
  },
  dot: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    borderWidth: 2, 
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center', 
    gap: 15 
  },
  button: { 
    width: 75, 
    height: 75, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center',
    // Petit effet de relief pour le tactile
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  buttonText: { 
    fontSize: 28, 
    fontWeight: '700',
  },
  cancelBtn: { 
    marginTop: 32, 
    padding: 10 
  },
  cancelText: { 
    fontWeight: '700', 
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1
  }
});