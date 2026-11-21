import React, {useState, useMemo} from 'react';
import './novaStudioAI.css';
import {
  Sparkles,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Calendar,
  Layers,
  Check
} from 'lucide-react';
import {
  ACTIVITY_CATEGORIES,
  VISIT_TYPES,
  type ActivityCategory,
  type VisitType,
  type DetectedInfo,
  analyzeWebsite,
  analyzeLogoColors,
  buildInitialBrandKit,
  inferCategory
} from './novaStudioAI';
import {
  STYLES,
  BRAND_COLOR_LABELS,
  generateBrand,
  checkContrast,
  contrastRatio,
  readableOn,
  toBarPatch,
  isHex,
  type BrandColors,
  type BrandKit,
  type StyleId
} from './brandKit';
import {
  STUDIO_LANGUAGES,
  type StudioLanguage,
  type ClientProfile,
  type StudioProject,
  readImage
} from './storage';

export type NovaStudioAIProps = {
  project: StudioProject;
  onApply: (updated: Partial<StudioProject>, clientProfile: ClientProfile, brandKit: BrandKit) => void;
  onClose: () => void;
};

export function NovaStudioAIAssistant({project, onApply, onClose}: NovaStudioAIProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'brand'>('info');

  // Champs Module 1 — Création et analyse
  const [clientName, setClientName] = useState(project.clientProfile?.name || project.name || '');
  const [projectName, setProjectName] = useState(project.name || '');
  const [activityCategory, setActivityCategory] = useState<ActivityCategory>(
    (project.clientProfile?.activityCategory as ActivityCategory) || 'autre'
  );
  const [website, setWebsite] = useState(project.clientProfile?.website || '');
  const [address, setAddress] = useState(project.clientProfile?.address || '');
  const [city, setCity] = useState(project.clientProfile?.city || '');
  const [phone, setPhone] = useState(project.clientProfile?.phone || '');
  const [email, setEmail] = useState(project.clientProfile?.email || '');
  const [bookingUrl, setBookingUrl] = useState(project.clientProfile?.bookingUrl || '');
  const [facebook, setFacebook] = useState(project.clientProfile?.facebook || '');
  const [instagram, setInstagram] = useState(project.clientProfile?.instagram || '');
  const [visitType, setVisitType] = useState<VisitType>(
    (project.clientProfile?.visitType as VisitType) || (project.vrEnabled ? 'hybrid' : 'premium')
  );
  const [selectedLanguages, setSelectedLanguages] = useState<StudioLanguage[]>(
    project.languages && project.languages.length ? project.languages : ['fr', 'en']
  );

  // Logo & Couleurs
  const [logoUrl, setLogoUrl] = useState<string>(project.clientProfile?.logoUrl || '');
  const [logoColors, setLogoColors] = useState<{primary: string; accent: string} | null>(null);

  // Données détectées
  const [analyzing, setAnalyzing] = useState(false);
  const [detected, setDetected] = useState<DetectedInfo | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // Module 2 — Charte graphique
  const [styleId, setStyleId] = useState<StyleId>(
    (project.brandKit?.styleId as StyleId) || 'moderne'
  );
  const [seedColor, setSeedColor] = useState<string>(
    project.brandKit?.seed && isHex(project.brandKit.seed) ? project.brandKit.seed : '#2f8fb5'
  );
  const [colors, setColors] = useState<BrandColors>(
    project.brandKit?.colors || generateBrand('#2f8fb5', 'moderne')
  );

  // Ratios et alertes WCAG
  const contrastIssues = useMemo(() => checkContrast(colors), [colors]);
  const hasContrastError = contrastIssues.some((i) => i.level === 'error');

  // Lancer l'analyse automatique du site web
  const runWebsiteAnalysis = async () => {
    if (!website.trim()) {
      setAnalysisError('Renseigne d’abord l’adresse du site internet.');
      return;
    }
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const data = await analyzeWebsite(website.trim());
      setDetected(data);

      // Auto-remplissage des champs s'ils sont vides
      if (data.address && !address) setAddress(data.address);
      if (data.city && !city) setCity(data.city);
      if (data.phone && !phone) setPhone(data.phone);
      if (data.email && !email) setEmail(data.email);
      if (data.bookingUrl && !bookingUrl) setBookingUrl(data.bookingUrl);
      if (data.facebook && !facebook) setFacebook(data.facebook);
      if (data.instagram && !instagram) setInstagram(data.instagram);

      // Logo sélectionné si trouvé
      if (data.logoUrls.length > 0 && !logoUrl) {
        setLogoUrl(data.logoUrls[0]);
      }

      // Catégorie suggérée
      const suggestedCategory = inferCategory(clientName || '', data.notes?.join(' '), data.services);
      if (suggestedCategory !== 'autre' && activityCategory === 'autre') {
        setActivityCategory(suggestedCategory);
      }

      // Initialisation de la charte
      const initial = buildInitialBrandKit(
        activityCategory !== 'autre' ? activityCategory : suggestedCategory,
        data,
        logoColors,
        styleId
      );
      setSeedColor(initial.seed);
      setColors(initial.kit.colors);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  // Import local d'un logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImage(file);
      setLogoUrl(dataUrl);

      // Analyse des couleurs du logo
      try {
        const pal = await analyzeLogoColors(dataUrl);
        setLogoColors(pal);
        if (pal.primary && isHex(pal.primary)) {
          setSeedColor(pal.primary);
          setColors(generateBrand(pal.primary, styleId));
        }
      } catch {
        // Logo sans couleur dominante détectable
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Fichier image non supporté');
    }
    e.target.value = '';
  };

  // Changement de style de charte
  const handleStyleChange = (newStyle: StyleId) => {
    setStyleId(newStyle);
    setColors(generateBrand(seedColor, newStyle));
  };

  // Changement de couleur de départ
  const handleSeedChange = (hex: string) => {
    setSeedColor(hex);
    if (isHex(hex)) {
      setColors(generateBrand(hex, styleId));
    }
  };

  // Modification manuelle d'une des 10 couleurs
  const handleColorUpdate = (key: keyof BrandColors, hex: string) => {
    if (isHex(hex)) {
      setColors((prev) => ({...prev, [key]: hex}));
    }
  };

  // Validation finale et application au projet
  const handleApply = () => {
    if (!clientName.trim()) {
      setActiveTab('info');
      setAnalysisError('Le nom commercial du client est obligatoire.');
      return;
    }

    const brandKit: BrandKit = {
      styleId,
      colors,
      validated: true,
      seed: seedColor,
    };

    const clientProfile: ClientProfile = {
      novagenId: project.clientProfile?.novagenId || '',
      name: clientName.trim(),
      category: ACTIVITY_CATEGORIES.find((c) => c.id === activityCategory)?.label || activityCategory,
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      facebook: facebook.trim(),
      instagram: instagram.trim(),
      otherLinks: '',
      description: project.clientProfile?.description || '',
      bookingUrl: bookingUrl.trim() || undefined,
      openingHours: detected?.openingHours || project.clientProfile?.openingHours || undefined,
      services: detected?.services?.length ? detected.services.join(', ') : project.clientProfile?.services || undefined,
      logoUrl: logoUrl.trim() || undefined,
      photoUrls: detected?.photoUrls?.length ? detected.photoUrls.slice(0, 30) : project.clientProfile?.photoUrls || [],
      sourceNotes: detected?.notes?.length ? detected.notes : project.clientProfile?.sourceNotes || [],
      activityCategory,
      stylePreference: styleId,
      visitType,
    };

    const barPatch = toBarPatch(colors);

    const projectUpdate: Partial<StudioProject> = {
      name: projectName.trim() || clientName.trim(),
      clientProfile,
      brandKit,
      barStyle: {
        ...project.barStyle,
        ...barPatch,
      },
      languages: selectedLanguages,
      vrEnabled: visitType === 'vr' || visitType === 'hybrid',
    };

    onApply(projectUpdate, clientProfile, brandKit);
    onClose();
  };

  return (
    <div className="nv-ai-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nv-ai-modal" role="dialog" aria-modal="true" aria-label="NovaStudio AI">
        {/* Entête */}
        <header className="nv-ai-header">
          <div className="nv-ai-header-title">
            <div className="nv-ai-badge-sparkle">
              <Sparkles size={24} />
            </div>
            <div>
              <h2>
                NovaStudio AI
                <span className="nv-ai-tag">Création intelligente</span>
              </h2>
              <p>
                Automatise la préparation complète de votre visite immersive 360° : coordonnées,
                charte graphique, boutons et points interactifs.
              </p>
            </div>
          </div>
          <button className="nv-ai-close-btn" onClick={onClose} title="Fermer" aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {/* Onglets d'étapes */}
        <nav className="nv-ai-tabs" aria-label="Étapes de création">
          <button
            type="button"
            className={`nv-ai-tab ${activeTab === 'info' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <span className="nv-ai-tab-step">1</span>
            <span>Client & Analyse</span>
          </button>
          <button
            type="button"
            className={`nv-ai-tab ${activeTab === 'brand' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('brand')}
          >
            <span className="nv-ai-tab-step">2</span>
            <span>Charte graphique & Couleurs</span>
          </button>
        </nav>

        {/* Corps de la modale */}
        <div className="nv-ai-body">
          {activeTab === 'info' && (
            <div className="nv-ai-grid">
              {/* Nom du client */}
              <div className="nv-ai-field">
                <label>
                  Nom commercial du client <span className="is-required">*</span>
                </label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. Le Mas des Oliviers, Hôtel Spa Grand Large..."
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    if (!projectName) setProjectName(e.target.value);
                  }}
                  autoFocus
                />
              </div>

              {/* Nom du projet */}
              <div className="nv-ai-field">
                <label>Nom du projet / de la visite</label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. Visite immersive 360°, Saison 2026..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              {/* Catégorie d'activité */}
              <div className="nv-ai-field">
                <label>Catégorie d'activité</label>
                <select
                  className="nv-ai-select"
                  value={activityCategory}
                  onChange={(e) => {
                    const cat = e.target.value as ActivityCategory;
                    setActivityCategory(cat);
                    const cfg = ACTIVITY_CATEGORIES.find((c) => c.id === cat);
                    if (cfg) {
                      setStyleId(cfg.defaultStyle);
                      setSeedColor(cfg.defaultSeed);
                      setColors(generateBrand(cfg.defaultSeed, cfg.defaultStyle));
                    }
                  }}
                >
                  {ACTIVITY_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type de visite */}
              <div className="nv-ai-field">
                <label>Type de visite souhaité</label>
                <select
                  className="nv-ai-select"
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as VisitType)}
                >
                  {VISIT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} — {t.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Site Internet & Analyse IA */}
              <div className="nv-ai-field is-wide">
                <label>
                  Site internet
                  {detected && <span className="badge-detected">✓ Analysé par l’IA</span>}
                </label>
                <div className="nv-ai-website-row">
                  <input
                    type="url"
                    className="nv-ai-input"
                    placeholder="https://www.mon-etablissement.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                  <button
                    type="button"
                    className="nv-ai-analyze-btn"
                    disabled={analyzing || !website.trim()}
                    onClick={runWebsiteAnalysis}
                  >
                    <Sparkles size={16} />
                    <span>{analyzing ? 'Analyse en cours…' : 'Analyser avec NovaStudio AI'}</span>
                  </button>
                </div>
              </div>

              {/* Logo du client */}
              <div className="nv-ai-field is-wide">
                <label>Logo du client</label>
                <div className="nv-ai-logo-zone">
                  <div className="nv-ai-logo-preview">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo client" />
                    ) : (
                      <Building2 size={24} color="#64748b" />
                    )}
                  </div>
                  <div className="nv-ai-logo-actions">
                    <label className="nv-ai-file-btn">
                      <Upload size={14} style={{display: 'inline', marginRight: 4}} />
                      Importer un logo (PNG, JPG, WebP)
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        style={{display: 'none'}}
                        onChange={handleLogoUpload}
                      />
                    </label>
                    <span>
                      {logoColors
                        ? `Couleurs extraites du logo : ${logoColors.primary} / ${logoColors.accent}`
                        : 'Importe le logo ou laisse l’IA l’extraire automatiquement du site web.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Adresse et Ville */}
              <div className="nv-ai-field">
                <label>Adresse</label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. 12 avenue des Plages"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="nv-ai-field">
                <label>Ville</label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. Biarritz, Paris, Annecy..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              {/* Téléphone et Email */}
              <div className="nv-ai-field">
                <label>Téléphone</label>
                <input
                  type="tel"
                  className="nv-ai-input"
                  placeholder="Ex. +33 4 68 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="nv-ai-field">
                <label>Adresse e-mail</label>
                <input
                  type="email"
                  className="nv-ai-input"
                  placeholder="Ex. contact@etablissement.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* URL de réservation */}
              <div className="nv-ai-field">
                <label>Lien de réservation (moteur direct, Booking, TheFork, Airbnb...)</label>
                <input
                  type="url"
                  className="nv-ai-input"
                  placeholder="https://booking.com/hotel/..."
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                />
              </div>

              {/* Réseaux sociaux */}
              <div className="nv-ai-field">
                <label>Réseaux sociaux (Facebook / Instagram)</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input
                    type="url"
                    className="nv-ai-input"
                    placeholder="Instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                  <input
                    type="url"
                    className="nv-ai-input"
                    placeholder="Facebook"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                  />
                </div>
              </div>

              {/* Langues souhaitées */}
              <div className="nv-ai-field is-wide">
                <label>Langues souhaitées pour la visite</label>
                <div style={{display: 'flex', gap: '0.65rem', flexWrap: 'wrap'}}>
                  {STUDIO_LANGUAGES.map((lang) => {
                    const isChecked = selectedLanguages.includes(lang.code);
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        className={`nv-ai-chip ${isChecked ? 'is-selected' : ''}`}
                        style={{
                          cursor: 'pointer',
                          border: isChecked ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                          background: isChecked ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)',
                        }}
                        onClick={() => {
                          if (isChecked) {
                            if (selectedLanguages.length > 1) {
                              setSelectedLanguages(selectedLanguages.filter((c) => c !== lang.code));
                            }
                          } else {
                            setSelectedLanguages([...selectedLanguages, lang.code]);
                          }
                        }}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {isChecked && <Check size={13} color="#38bdf8" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Erreur d'analyse éventuelle */}
              {analysisError && (
                <div className="nv-ai-field is-wide" style={{color: '#f43f5e', fontSize: '0.85rem'}}>
                  ⚠️ {analysisError}
                </div>
              )}

              {/* Synthèse des données détectées */}
              {detected && (
                <div className="nv-ai-field is-wide nv-ai-detected-card">
                  <div className="nv-ai-detected-head">
                    <h4>
                      <CheckCircle2 size={16} />
                      Informations publiques récupérées sur le site
                    </h4>
                    <span style={{fontSize: '0.78rem', color: '#94a3b8'}}>
                      Vérifie et complète les données avant validation
                    </span>
                  </div>
                  <div className="nv-ai-detected-chips">
                    {detected.colors.length > 0 && (
                      <div className="nv-ai-chip">
                        <span>Palette du site :</span>
                        {detected.colors.slice(0, 6).map((c, i) => (
                          <i key={i} className="color-dot" style={{background: c}} title={c} />
                        ))}
                      </div>
                    )}
                    {detected.fonts.length > 0 && (
                      <div className="nv-ai-chip">
                        <span>Typographies :</span>
                        <strong>{detected.fonts.slice(0, 3).join(', ')}</strong>
                      </div>
                    )}
                    {detected.phone && (
                      <div className="nv-ai-chip">
                        <Phone size={12} /> {detected.phone}
                      </div>
                    )}
                    {detected.email && (
                      <div className="nv-ai-chip">
                        <Mail size={12} /> {detected.email}
                      </div>
                    )}
                    {detected.bookingUrl && (
                      <div className="nv-ai-chip">
                        <Calendar size={12} /> Réservation détectée
                      </div>
                    )}
                    {detected.services && detected.services.length > 0 && (
                      <div className="nv-ai-chip">
                        <Layers size={12} /> {detected.services.length} prestations identifiées
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'brand' && (
            <div>
              {/* Choix du style de la charte */}
              <div style={{marginBottom: '1rem'}}>
                <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem'}}>
                  Ambiance graphique & style de la charte
                </label>
                <div className="nv-ai-styles-selector">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`nv-ai-style-card ${styleId === s.id ? 'is-selected' : ''}`}
                      onClick={() => handleStyleChange(s.id)}
                    >
                      <strong>{s.label}</strong>
                    </button>
                  ))}
                </div>
              </div>

              {/* Couleur de départ (graine) */}
              <div style={{marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1'}}>
                  Couleur de départ (seed) :
                </label>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <input
                    type="color"
                    className="nv-ai-color-picker"
                    value={seedColor}
                    onChange={(e) => handleSeedChange(e.target.value)}
                  />
                  <input
                    type="text"
                    className="nv-ai-color-hex"
                    value={seedColor}
                    onChange={(e) => handleSeedChange(e.target.value)}
                    maxLength={7}
                  />
                </div>
                {detected?.themeColor && (
                  <button
                    type="button"
                    className="nv-ai-btn-ghost"
                    style={{padding: '0.25rem 0.65rem', fontSize: '0.78rem'}}
                    onClick={() => handleSeedChange(detected.themeColor!)}
                  >
                    Reprendre la couleur du site ({detected.themeColor})
                  </button>
                )}
              </div>

              {/* Grille des 10 couleurs */}
              <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem'}}>
                Palette personnalisée des 10 couleurs du projet
              </label>
              <div className="nv-ai-colors-grid">
                {(Object.keys(BRAND_COLOR_LABELS) as Array<keyof BrandColors>).map((key) => (
                  <div key={key} className="nv-ai-color-row">
                    <span className="nv-ai-color-label">{BRAND_COLOR_LABELS[key]}</span>
                    <div className="nv-ai-color-controls">
                      <input
                        type="color"
                        className="nv-ai-color-picker"
                        value={colors[key]}
                        onChange={(e) => handleColorUpdate(key, e.target.value)}
                      />
                      <input
                        type="text"
                        className="nv-ai-color-hex"
                        value={colors[key]}
                        onChange={(e) => handleColorUpdate(key, e.target.value)}
                        maxLength={7}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Aperçu interactif en direct */}
              <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem'}}>
                Aperçu en direct de l'identité visuelle
              </label>
              <div
                className="nv-ai-live-preview"
                style={{
                  background: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }}
              >
                <div className="nv-ai-preview-head">
                  <div>
                    <h3 style={{color: colors.text}}>{clientName || 'Nom de votre établissement'}</h3>
                    <small style={{color: colors.text, opacity: 0.75}}>
                      {address || 'Visite immersive 360°'} · Style {STYLES.find((s) => s.id === styleId)?.label}
                    </small>
                  </div>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        background: colors.primary,
                        color: readableOn(colors.primary),
                        fontWeight: 700,
                      }}
                    >
                      Primaire
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        background: colors.secondary,
                        color: readableOn(colors.secondary),
                        fontWeight: 700,
                      }}
                    >
                      Secondaire
                    </span>
                  </div>
                </div>

                <div className="nv-ai-preview-buttons">
                  <span
                    className="nv-ai-preview-btn"
                    style={{
                      background: colors.btnRest,
                      color: readableOn(colors.btnRest),
                      borderColor: colors.border,
                    }}
                  >
                    Bouton au repos
                  </span>
                  <span
                    className="nv-ai-preview-btn"
                    style={{
                      background: colors.btnHover,
                      color: readableOn(colors.btnHover),
                      borderColor: colors.glow,
                      boxShadow: `0 0 12px ${colors.glow}77`,
                    }}
                  >
                    Bouton au survol ✨
                  </span>
                  <span
                    className="nv-ai-preview-btn"
                    style={{
                      background: colors.btnPressed,
                      color: readableOn(colors.btnPressed),
                      borderColor: colors.border,
                      transform: 'scale(0.96)',
                      opacity: 0.9,
                    }}
                  >
                    Bouton à l’appui
                  </span>
                </div>
              </div>

              {/* Contrôle de contraste WCAG */}
              <div className="nv-ai-contrast-box">
                {contrastIssues.length === 0 ? (
                  <div className="nv-ai-contrast-ok">
                    <CheckCircle2 size={16} />
                    <span>Conformité WCAG AA validée : excellents contrastes et lisibilité irréprochable.</span>
                  </div>
                ) : (
                  contrastIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={issue.level === 'error' ? 'nv-ai-contrast-error' : 'nv-ai-contrast-warn'}
                    >
                      {issue.level === 'error' ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                      <span>{issue.text}</span>
                    </div>
                  ))
                )}
                <div style={{color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.2rem'}}>
                  Contraste Texte sur Fond :{' '}
                  <strong>{contrastRatio(colors.text, colors.background).toFixed(1)} : 1</strong> (Seuil minimal recommandé : 4.5:1)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page d'action */}
        <footer className="nv-ai-footer">
          <div className="nv-ai-footer-left">
            <span>NovaStudio AI · Assistant Phase 1</span>
            {hasContrastError && <span style={{color: '#f43f5e'}}> · ⚠️ Contrastes WCAG à surveiller</span>}
          </div>
          <div className="nv-ai-footer-right">
            {activeTab === 'brand' ? (
              <>
                <button type="button" className="nv-ai-btn-ghost" onClick={() => setActiveTab('info')}>
                  <ArrowLeft size={16} style={{display: 'inline', marginRight: 4}} />
                  Précédent
                </button>
                <button
                  type="button"
                  className="nv-ai-btn-primary"
                  onClick={handleApply}
                >
                  <Sparkles size={16} />
                  <span>Valider la charte & Appliquer au projet</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" className="nv-ai-btn-ghost" onClick={onClose}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="nv-ai-btn-primary"
                  onClick={() => {
                    if (!clientName.trim()) {
                      setAnalysisError('Renseigne le nom commercial du client avant de continuer.');
                      return;
                    }
                    setAnalysisError('');
                    setActiveTab('brand');
                  }}
                >
                  <span>Continuer vers la Charte</span>
                  <ArrowRight size={16} style={{display: 'inline', marginLeft: 4}} />
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
