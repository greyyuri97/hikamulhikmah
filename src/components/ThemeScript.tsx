// Applies saved theme + font scale before paint to avoid a flash.
export default function ThemeScript() {
  const js = `try{var t=JSON.parse(localStorage.getItem('hk-theme')||'"light"');if(t!=='dark'){t='light';localStorage.setItem('hk-theme','"light"')}document.documentElement.dataset.theme=t;var s=JSON.parse(localStorage.getItem('hk-scale')||'1');document.documentElement.style.setProperty('--font-scale',s)}catch(e){}try{if(sessionStorage.getItem('hk-splash')!=='1'&&location.pathname.indexOf('/admin')!==0)document.documentElement.dataset.splash='1'}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
