export function useSedeColors(tema) {
  return {
    bg:      tema === 'dark' ? '#0a0a0a' : '#ffffff',
    surface: tema === 'dark' ? '#111111' : '#f9f9f8',
    surface2:tema === 'dark' ? '#191919' : '#f1f0ee',
    border:  tema === 'dark' ? '#222222' : '#e5e4e0',
    border2: tema === 'dark' ? '#2e2e2e' : '#d4d3cf',
    text:    tema === 'dark' ? '#ffffff' : '#111111',
    muted:   tema === 'dark' ? '#666666' : '#888882',
    faint:   tema === 'dark' ? '#333333' : '#c8c7c3',
    canvas:  tema === 'dark' ? '#060606' : '#f4f3f0',
    dot:     tema === 'dark' ? '#1e1e1e' : '#d0cfc9',
  };
}