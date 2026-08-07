export function SiteFooter() {
  return (
    <footer className="w-full flex flex-col items-center justify-center gap-2 border-t mx-auto text-center text-xs py-16">
      <a
        href="https://github.com/archy712/weekly-plan-02/blob/main/README.md"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold underline underline-offset-4 hover:text-foreground"
      >
        프로젝트 도움말
      </a>
      <p>
        Developed by <span className="font-bold">archy712@gmail.com</span>
      </p>
    </footer>
  );
}
