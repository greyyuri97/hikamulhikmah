import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p dir="rtl" className="font-arabic text-3xl text-accent">لم يُوجد</p>
      <h1 className="mt-2 font-serif text-xl">Halaman tidak ditemui</h1>
      <Link href="/" className="btn-accent mt-6">Kembali ke Utama</Link>
    </div>
  );
}
