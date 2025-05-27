# Self-Healing Scraper Systemd Integration

This directory contains systemd unit files for running the Self-Healing Scraper on Linux servers without GitHub Actions.

## Installation

1. Copy both unit files to the systemd directory:
   ```bash
   sudo cp selfheal-scraper.service selfheal-scraper.timer /etc/systemd/system/
   ```

2. Create a dedicated user for the scraper (optional but recommended):
   ```bash
   sudo useradd -r -s /bin/false scraper
   ```

3. Install the Self-Healing Scraper to `/opt/self-healing-scraper`:
   ```bash
   sudo mkdir -p /opt/self-healing-scraper
   sudo chown scraper:scraper /opt/self-healing-scraper
   git clone https://github.com/yourusername/self-healing-scraper.git /opt/self-healing-scraper
   cd /opt/self-healing-scraper
   pnpm install
   ```

4. Edit the service file to set your API key and target URL:
   ```bash
   sudo vi /etc/systemd/system/selfheal-scraper.service
   ```
   
   Update the following lines:
   ```
   Environment=ANTHROPIC_API_KEY=your_api_key_here
   Environment=SCRAPE_URL=https://example.com/your/target/url
   ```

5. Reload systemd configuration:
   ```bash
   sudo systemctl daemon-reload
   ```

6. Enable and start the timer:
   ```bash
   sudo systemctl enable selfheal-scraper.timer
   sudo systemctl start selfheal-scraper.timer
   ```

## Monitoring

- Check timer status:
  ```bash
  sudo systemctl status selfheal-scraper.timer
  ```

- Check when the timer will run next:
  ```bash
  sudo systemctl list-timers selfheal-scraper.timer
  ```

- Check the service logs:
  ```bash
  sudo journalctl -u selfheal-scraper.service
  ```

## Customization

- To change the schedule, edit the `OnUnitActiveSec` setting in the timer file.
- To add environment variables or change service parameters, edit the service file.