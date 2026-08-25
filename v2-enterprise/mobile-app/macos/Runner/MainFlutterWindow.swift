import Cocoa
import FlutterMacOS

class MainFlutterWindow: NSWindow {
  override func awakeFromNib() {
    let flutterViewController = FlutterViewController()
    var windowFrame = self.frame
    windowFrame.size = CGSize(width: 390, height: 844)
    
    // Position window on the left side of the screen automatically
    if let screen = NSScreen.main {
      let screenFrame = screen.visibleFrame
      let leftX = screenFrame.origin.x + 40 // 40 pixels padding from left edge
      let centerY = screenFrame.origin.y + (screenFrame.size.height - 844) / 2
      windowFrame.origin = CGPoint(x: leftX, y: centerY)
    }
    
    self.contentViewController = flutterViewController
    self.setFrame(windowFrame, display: true)
    
    // Lock window to mobile aspect ratio
    self.minSize = NSSize(width: 390, height: 844)
    self.maxSize = NSSize(width: 390, height: 844)

    RegisterGeneratedPlugins(registry: flutterViewController)

    super.awakeFromNib()
  }
}
