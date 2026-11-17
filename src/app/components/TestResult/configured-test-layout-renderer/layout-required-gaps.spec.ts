import {
  layoutRequiredGaps,
  layoutPhotoGaps,
  checkLayoutGaps,
  parseExecutionExtra,
  extractCanonicalSections
} from './layout-required-gaps';

describe('layout-required-gaps (pure function)', () => {
  const sec = (type: string, config: Record<string, any> = {}, title = type) => ({
    id: String(Math.random()),
    type,
    title,
    config: { enabled: true, ...config }
  });

  describe('layoutRequiredGaps', () => {
    it('reports missing required narrative when empty or whitespace', () => {
      const sections = [
        sec('narrative', { label: 'General Remarks', sectionKey: 'first' }), // primary -> skipped
        sec('narrative', { label: 'Microstructure Note', sectionKey: 'micro', required: true }),
        sec('parameter')
      ];

      // Missing
      expect(layoutRequiredGaps(sections, {})).toEqual(['Microstructure Note']);
      expect(layoutRequiredGaps(sections, JSON.stringify({ narratives: { micro: '   ' } }))).toEqual(['Microstructure Note']);

      // Filled
      expect(layoutRequiredGaps(sections, { narratives: { micro: 'Fine pearlite observed.' } })).toEqual([]);
    });

    it('honors default text for required narrative if not edited', () => {
      const sections = [
        sec('narrative', { label: 'General Remarks', sectionKey: 'first' }),
        sec('narrative', { label: 'Etchant', sectionKey: 'etch', required: true, defaultText: '2 % Nital' }),
      ];

      expect(layoutRequiredGaps(sections, {})).toEqual([]);
    });

    it('reports missing required condition fields', () => {
      const sections = [
        sec('condition', { fields: ['Test Temperature', 'Relative Humidity'], required: true, sectionKey: 'env' }),
      ];

      // Both missing
      expect(layoutRequiredGaps(sections, {})).toEqual(['Test Temperature', 'Relative Humidity']);

      // Partial
      const partial = { conditionValues: { 'Test Temperature': '23 °C' } };
      expect(layoutRequiredGaps(sections, partial)).toEqual(['Relative Humidity']);

      // Fully filled
      const filled = { conditionValues: { 'Test Temperature': '23 °C', 'Relative Humidity': '55 %' } };
      expect(layoutRequiredGaps(sections, filled)).toEqual([]);
    });

    it('reports missing runtime-added condition fields if configured as required', () => {
      const sections = [
        sec('condition', { fields: ['Test Temperature'], required: true, sectionKey: 'env' }),
      ];
      const extra = {
        conditionFields: { env: ['Test Temperature', 'Pre-heat Time'] },
        conditionValues: { 'Test Temperature': '200 °C' } // Pre-heat Time not entered
      };

      expect(layoutRequiredGaps(sections, extra)).toEqual(['Pre-heat Time']);
    });

    it('reports checklist when requireAll is true and items are unanswered', () => {
      const sections = [
        sec('checklist', { tableRows: [{ label: 'Zero calibration' }, { label: 'Span verification' }], requireAll: true }, 'Calibration Checklist'),
      ];

      // No checklist state passed (none answered)
      expect(layoutRequiredGaps(sections, {})).toEqual(['Calibration Checklist: every item needs an answer']);

      // Some unanswered
      const partialChecklist = [
        { id: 1, label: 'Zero calibration', status: 'Pass' },
        { id: 2, label: 'Span verification', status: '' }
      ];
      expect(layoutRequiredGaps(sections, {}, partialChecklist)).toEqual(['Calibration Checklist: every item needs an answer']);

      // All answered
      const allAnswered = [
        { id: 1, label: 'Zero calibration', status: 'Pass' },
        { id: 2, label: 'Span verification', status: 'Pass' }
      ];
      expect(layoutRequiredGaps(sections, {}, allAnswered)).toEqual([]);
    });

    it('handles legacy comma-separated items string for checklist', () => {
      const sections = [
        sec('checklist', { items: 'Visual check, Dimension check', requireAll: true }, 'Inspection'),
      ];

      expect(layoutRequiredGaps(sections, {})).toEqual(['Inspection: every item needs an answer']);

      const answered = [
        { id: 1, label: 'Visual check', status: 'Pass' },
        { id: 2, label: 'Dimension check', status: 'NA' }
      ];
      expect(layoutRequiredGaps(sections, {}, answered)).toEqual([]);
    });

    it('returns empty array when sections are empty or executionExtra is invalid json', () => {
      expect(layoutRequiredGaps([], null)).toEqual([]);
      expect(layoutRequiredGaps(null, 'invalid-json')).toEqual([]);
    });
  });

  describe('layoutPhotoGaps', () => {
    it('reports missing required photo when requirePhotoToVerify is true', () => {
      const slots = [
        { id: 's1', title: 'Fracture Surface', mandatory: true, bindingSource: 'runtime' },
        { id: 's2', title: 'Macro Etch', mandatory: false, bindingSource: 'runtime' },
        { id: 's3', title: 'Standard Sketch', mandatory: true, bindingSource: 'static', imageUrl: 'data:image/png;base64,123' }
      ];
      const sections = [
        sec('photo', { photoSlots: slots, requirePhotoToVerify: true })
      ];

      // Missing fracture surface
      expect(layoutPhotoGaps(sections, [])).toEqual(['Fracture Surface']);

      // Provided with matching caption
      const images = [{ url: 'http://img1', caption: 'Fracture Surface' }];
      expect(layoutPhotoGaps(sections, images)).toEqual([]);

      // Provided without matching caption -> fills in order
      const unnamedImages = [{ url: 'http://img2', name: 'photo.jpg' }];
      expect(layoutPhotoGaps(sections, unnamedImages)).toEqual([]);
    });

    it('ignores photo slots if requirePhotoToVerify is not true', () => {
      const slots = [
        { id: 's1', title: 'Optional Verification Photo', mandatory: true, bindingSource: 'runtime' }
      ];
      const sections = [
        sec('photo', { photoSlots: slots, requirePhotoToVerify: false })
      ];

      expect(layoutPhotoGaps(sections, [])).toEqual([]);
    });
  });

  describe('checkLayoutGaps', () => {
    it('aggregates required and photo gaps seamlessly', () => {
      const sections = [
        sec('narrative', { label: 'Remarks', sectionKey: 'first' }),
        sec('narrative', { label: 'Defect Summary', sectionKey: 'defects', required: true }),
        sec('photo', { photoSlots: [{ title: 'Microstructure', mandatory: true }], requirePhotoToVerify: true })
      ];

      const res = checkLayoutGaps({
        sections,
        executionExtra: {},
        testImages: []
      });

      expect(res.requiredGaps).toEqual(['Defect Summary']);
      expect(res.photoGaps).toEqual(['Microstructure']);
      expect(res.allGaps).toEqual(['Defect Summary', 'Microstructure']);
    });
  });
});
