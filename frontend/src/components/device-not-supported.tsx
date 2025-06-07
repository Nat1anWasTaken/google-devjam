export function DeviceNotSupported() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="flex flex-row gap-2 items-center justify-center">
          <h1 className="text-4xl">不支援的裝置</h1>
        </div>
        <p className="text-lg text-muted-foreground">此應用程式不支援您的裝置，請使用行動裝置訪問。</p>
      </div>
    </div>
  );
}
