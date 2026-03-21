export type Lang = 'en' | 'fr';

export const translations = {
  en: {
    // Branding
    appName: 'Employee Time Clock',
    company: 'Samway Sandwich',

    // Main screen
    currentTime: 'Current Time',
    employeeId: 'Employee ID',
    enterEmployeeId: 'Enter your Employee ID',
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    admin: 'Admin',

    // Camera
    takePhoto: 'Take Your Photo',
    positionYourself: 'Position yourself in the frame',
    capturePhoto: 'Capture Photo',
    cancel: 'Cancel',

    // Verifying
    verifying: 'Verifying identity…',

    // Confirmation
    clockedIn: 'Clocked In!',
    clockedOut: 'Clocked Out!',
    haveAGreatShift: 'Have a great shift!',
    thankYouHardWork: 'Thank you for your hard work today!',
    employeeLabel: 'Employee',
    timeLabel: 'Time',
    done: 'Done',
    saving: 'Saving record…',

    // Errors — main page
    alreadyClockedIn: 'You are already clocked in.',
    notClockedIn: 'You are not clocked in yet.',
    employeeNotFound: 'Employee ID not found. Please see your manager.',
    verificationFailed: 'Face verification failed. Please try again.',
    cameraError: 'Unable to access camera. Please check permissions.',
    saveFailed: 'Failed to save record. Please try again.',

    // Admin — nav
    clockRecordsTab: 'Clock Records',
    employeesTab: 'Employees',
    verificationLogsTab: 'Verification Logs',
    exportCsv: 'Export CSV',
    logout: 'Logout',

    // Admin — records table
    filterByName: 'Filter by name or ID',
    from: 'From',
    to: 'To',
    clearFilters: 'Clear filters',
    loading: 'Loading…',
    noRecords: 'No records found',
    photo: 'Photo',
    idCol: 'Emp. ID',
    nameCol: 'Name',
    actionCol: 'Action',
    dateCol: 'Date',
    timeCol: 'Time',
    close: 'Close',
    clockInBadge: 'Clock In',
    clockOutBadge: 'Clock Out',
    recordsSuffix: 'records',

    // Admin — employees
    addEmployee: 'Add Employee',
    employeeIdLabel: 'Employee ID',
    employeeName: 'Full Name',
    facePhotoLabel: 'Reference Face Photo',
    uploadPhoto: 'Upload Photo',
    orUseCameraLabel: 'or use camera',
    noEmployees: 'No employees registered yet.',
    editEmployee: 'Edit Employee',
    deleteEmployee: 'Delete',
    confirmDelete: 'Delete this employee?',
    save: 'Save',
    saving2: 'Saving…',
    duplicateEmployeeId: 'This Employee ID is already in use.',
    hasFacePhoto: 'Has face photo',
    noFacePhoto: 'No face photo',

    // Admin — verification logs
    noVerificationLogs: 'No verification attempts logged.',
    successBadge: 'Success',
    failedBadge: 'Failed',
    reasonCol: 'Reason',

    // Login
    adminAccess: 'Admin Access',
    password: 'Password',
    login: 'Login',
    checking: 'Checking…',
    wrongPassword: 'Incorrect password',
    backToClock: 'Back to Clock',

    // PIN & reason
    pinLabel: 'Personal PIN',
    enterPin: 'Enter PIN (if set)',
    wrongPin: 'Incorrect PIN. Please try again.',
    reasonLabel: 'Reason',
    reasonProduction: 'Production',
    reasonReturnBreak: 'Return from Break',
    reasonBreak: 'Go on Break',
    reasonEndShift: 'End of Shift',
    selectReason: 'Select a reason',

    // Status check
    checkStatus: 'Check My Status',
    statusTitle: 'Attendance Status',
    statusIn: 'Currently Clocked In',
    statusOut: 'Currently Clocked Out',
    statusNever: 'No record found',
    statusSince: 'Since',

    // Change password
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    passwordChanged: 'Password changed successfully!',
    passwordMismatch: 'Passwords do not match.',
    passwordTooShort: 'Password must be at least 6 characters.',
    incorrectCurrentPwd: 'Current password is incorrect.',

    // Profile & security
    profileSettings: 'Profile & Security',
    recoveryEmail: 'Recovery Email',
    recoveryPhone: 'Recovery Phone',
    profileSaved: 'Profile saved.',

    // Employee PIN in admin
    pinLabel2: 'PIN Code',
    setPinPlaceholder: 'Set 4-6 digit PIN',
    noPinRequired: 'No PIN set — anyone can clock in with this ID',

    // Verification log filter
    filterLogs: 'Filter by name or ID',

    // Forgot password (login page)
    forgotPassword: 'Forgot Password?',
    backToLogin: 'Back to Login',
    resetContactLabel: 'Recovery email or phone',
    resetContactPlaceholder: 'your@email.com or +1 555 000 0000',
    resetNewPassword: 'New Password',
    resetConfirm: 'Confirm New Password',
    resetSubmit: 'Reset Password',
    resetSuccess: 'Password reset. You can now log in.',
    resetContactNotFound: 'Email or phone not found in records.',
  },
  fr: {
    appName: 'Pointeuse Employé',
    company: 'Samway Sandwich',

    currentTime: 'Heure Actuelle',
    employeeId: 'Identifiant Employé',
    enterEmployeeId: 'Entrez votre identifiant',
    clockIn: 'Pointer Entrée',
    clockOut: 'Pointer Sortie',
    admin: 'Admin',

    takePhoto: 'Prenez Votre Photo',
    positionYourself: 'Positionnez-vous dans le cadre',
    capturePhoto: 'Capturer',
    cancel: 'Annuler',

    verifying: 'Vérification de l\'identité…',

    clockedIn: 'Entrée Enregistrée !',
    clockedOut: 'Sortie Enregistrée !',
    haveAGreatShift: 'Bonne journée de travail !',
    thankYouHardWork: 'Merci pour votre travail aujourd\'hui !',
    employeeLabel: 'Employé',
    timeLabel: 'Heure',
    done: 'Terminer',
    saving: 'Enregistrement…',

    alreadyClockedIn: 'Vous êtes déjà pointé à l\'entrée.',
    notClockedIn: 'Vous n\'avez pas encore pointé à l\'entrée.',
    employeeNotFound: 'Identifiant introuvable. Contactez votre responsable.',
    verificationFailed: 'Échec de la vérification faciale. Veuillez réessayer.',
    cameraError: 'Impossible d\'accéder à la caméra. Vérifiez les permissions.',
    saveFailed: 'Échec de l\'enregistrement. Veuillez réessayer.',

    clockRecordsTab: 'Pointages',
    employeesTab: 'Employés',
    verificationLogsTab: 'Journal de Vérification',
    exportCsv: 'Exporter CSV',
    logout: 'Déconnexion',

    filterByName: 'Filtrer par nom ou identifiant',
    from: 'Du',
    to: 'Au',
    clearFilters: 'Effacer les filtres',
    loading: 'Chargement…',
    noRecords: 'Aucun pointage trouvé',
    photo: 'Photo',
    idCol: 'ID Emp.',
    nameCol: 'Nom',
    actionCol: 'Action',
    dateCol: 'Date',
    timeCol: 'Heure',
    close: 'Fermer',
    clockInBadge: 'Entrée',
    clockOutBadge: 'Sortie',
    recordsSuffix: 'pointages',

    addEmployee: 'Ajouter un Employé',
    employeeIdLabel: 'Identifiant',
    employeeName: 'Nom Complet',
    facePhotoLabel: 'Photo de Référence',
    uploadPhoto: 'Télécharger Photo',
    orUseCameraLabel: 'ou utiliser la caméra',
    noEmployees: 'Aucun employé enregistré.',
    editEmployee: 'Modifier',
    deleteEmployee: 'Supprimer',
    confirmDelete: 'Supprimer cet employé ?',
    save: 'Sauvegarder',
    saving2: 'Sauvegarde…',
    duplicateEmployeeId: 'Cet identifiant est déjà utilisé.',
    hasFacePhoto: 'Photo disponible',
    noFacePhoto: 'Pas de photo',

    noVerificationLogs: 'Aucune tentative de vérification enregistrée.',
    successBadge: 'Succès',
    failedBadge: 'Échec',
    reasonCol: 'Raison',

    adminAccess: 'Accès Admin',
    password: 'Mot de passe',
    login: 'Connexion',
    checking: 'Vérification…',
    wrongPassword: 'Mot de passe incorrect',
    backToClock: 'Retour à la Pointeuse',

    // PIN & reason
    pinLabel: 'Code PIN personnel',
    enterPin: 'Entrer le PIN (si défini)',
    wrongPin: 'PIN incorrect. Veuillez réessayer.',
    reasonLabel: 'Raison',
    reasonProduction: 'Production',
    reasonReturnBreak: 'Retour de pause',
    reasonBreak: 'Partir en pause',
    reasonEndShift: 'Fin de poste',
    selectReason: 'Sélectionnez une raison',

    // Status check
    checkStatus: 'Vérifier mon statut',
    statusTitle: 'Statut de présence',
    statusIn: 'Actuellement pointé à l\'entrée',
    statusOut: 'Actuellement pointé à la sortie',
    statusNever: 'Aucun enregistrement trouvé',
    statusSince: 'Depuis',

    // Change password
    changePassword: 'Changer le mot de passe',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau mot de passe',
    passwordChanged: 'Mot de passe changé avec succès !',
    passwordMismatch: 'Les mots de passe ne correspondent pas.',
    passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères.',
    incorrectCurrentPwd: 'Le mot de passe actuel est incorrect.',

    // Profile & security
    profileSettings: 'Profil et sécurité',
    recoveryEmail: 'Email de récupération',
    recoveryPhone: 'Téléphone de récupération',
    profileSaved: 'Profil sauvegardé.',

    // Employee PIN in admin
    pinLabel2: 'Code PIN',
    setPinPlaceholder: 'Définir un PIN de 4 à 6 chiffres',
    noPinRequired: 'Aucun PIN — tout le monde peut pointer avec cet identifiant',

    // Verification log filter
    filterLogs: 'Filtrer par nom ou identifiant',

    // Forgot password (login page)
    forgotPassword: 'Mot de passe oublié ?',
    backToLogin: 'Retour à la connexion',
    resetContactLabel: 'Email ou téléphone de récupération',
    resetContactPlaceholder: 'votre@email.com ou +33 6 00 00 00 00',
    resetNewPassword: 'Nouveau mot de passe',
    resetConfirm: 'Confirmer le nouveau mot de passe',
    resetSubmit: 'Réinitialiser',
    resetSuccess: 'Mot de passe réinitialisé. Vous pouvez vous connecter.',
    resetContactNotFound: 'Email ou téléphone introuvable dans nos enregistrements.',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(lang: Lang, key: TranslationKey): string {
  return (translations[lang] as Record<string, string>)[key]
    ?? (translations.en as Record<string, string>)[key]
    ?? key;
}
