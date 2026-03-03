/**
 * PinPadModal - Clavier de sécurité pour O'PIED DU MONT
 * Emplacement : /components/PinPadModal.tsx
 * Version : Corrigée (Erreur TS Property 'name' does not exist)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { useApp } from '../app-context';
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
      
      // Si on atteint 4 chiffres, on déclenche la vérification
      if (newPin.length === 4) {
        verifyPinLocally(newPin);
      }
    }
  };

  /**
   * Vérification locale basée sur les données chargées dans le contexte
   */
  const verifyPinLocally = (code: string) => {
    // On s'assure que employees est un tableau
    const employees = state.employees || [];
    
    // Recherche de l'employé avec le PIN correspondant et le statut actif
    // Utilisation de 'nom' uniquement pour corriger l'erreur TS 2339
    const employee = employees.find((emp: any) => 
      emp.pin === code && (emp.actif === true || emp.actif === undefined)
    );

    if (employee) {
      // On utilise 'nom' car c'est la propriété définie dans ton type Employee
      onSuccess(employee.nom);
      setPin('');
    } else {
      Alert.alert(
        'Accès Refusé', 
        'Code PIN incorrect ou compte employé désactivé.',
        [{ text: 'Réessayer', onPress: () => setPin('') }]
      );
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
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => {
              const isSpecial = btn === 'C' || btn === '⌫';
              
              return (
                <TouchableOpacity
                  key={btn}
                  style={[
                    styles.button, 
                    { backgroundColor: colors.background },
                    isSpecial && { 
                      backgroundColor: colors.surface, 
                      borderWidth: 1, 
                      borderColor: colors.border 
                    }
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
                    isSpecial && { fontSize: 18, color: '#ef4444' }
                  ]}>
                    {btn}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
    backgroundColor: 'rgba(0,0,0,0.75)', 
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
    letterSpacing: 0.5,
    textAlign: 'center'
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
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1
  }
});