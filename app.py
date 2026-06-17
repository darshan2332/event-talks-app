import os
import re
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Simple in-memory cache
CACHE_TIMEOUT = 600  # 10 minutes
feed_cache = {
    "data": None,
    "last_updated": 0
}

def clean_html_formatting(html_content):
    """
    Cleans up some formatting in the HTML content, like making links open in new tabs.
    """
    # Replace <a href=...> with <a target="_blank" rel="noopener noreferrer" href=...>
    html_content = re.sub(
        r'<a\s+(?!target=)', 
        r'<a target="_blank" rel="noopener noreferrer" ', 
        html_content, 
        flags=re.IGNORECASE
    )
    return html_content

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    
    # Parse XML content
    root = ET.fromstring(response.content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', ns)
    
    parsed_updates = []
    
    for entry in entries:
        date_str = entry.find('atom:title', ns).text
        updated_str = entry.find('atom:updated', ns).text
        
        link_elem = entry.find('atom:link', ns)
        link = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        if not content_html:
            continue
            
        # Split content_html by <h3> tags
        parts = re.split(r'(<h3>.*?</h3>)', content_html, flags=re.IGNORECASE)
        
        entry_id = entry.find('atom:id', ns).text
        
        if len(parts) <= 1:
            # No h3 tags found. Treat the whole body as one update
            body_text = re.sub(r'<[^>]+>', '', content_html).strip()
            clean_text = re.sub(r'\s+', ' ', body_text)
            
            parsed_updates.append({
                'id': f"{entry_id}_0",
                'date': date_str,
                'updated': updated_str,
                'type': 'Update',
                'html': clean_html_formatting(content_html),
                'text': clean_text,
                'link': link
            })
        else:
            # If there's text before the first <h3> tag, capture it
            first_part = parts[0].strip()
            if first_part:
                body_text = re.sub(r'<[^>]+>', '', first_part).strip()
                clean_text = re.sub(r'\s+', ' ', body_text)
                parsed_updates.append({
                    'id': f"{entry_id}_0",
                    'date': date_str,
                    'updated': updated_str,
                    'type': 'Update',
                    'html': clean_html_formatting(first_part),
                    'text': clean_text,
                    'link': link
                })
            
            i = 1
            idx = 1
            while i < len(parts):
                header_html = parts[i]
                header_match = re.search(r'<h3>(.*?)</h3>', header_html, re.IGNORECASE)
                header_text = header_match.group(1).strip() if header_match else "Update"
                
                body_html = parts[i+1] if i+1 < len(parts) else ""
                body_text = re.sub(r'<[^>]+>', '', body_html).strip()
                clean_text = re.sub(r'\s+', ' ', body_text)
                
                parsed_updates.append({
                    'id': f"{entry_id}_{idx}",
                    'date': date_str,
                    'updated': updated_str,
                    'type': header_text,
                    'html': clean_html_formatting(header_html + body_html),
                    'text': clean_text,
                    'link': link
                })
                i += 2
                idx += 1
                
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    # Check if cache is valid
    if not force_refresh and feed_cache["data"] is not None and (now - feed_cache["last_updated"] < CACHE_TIMEOUT):
        return jsonify({
            "status": "success",
            "source": "cache",
            "last_updated": feed_cache["last_updated"],
            "data": feed_cache["data"]
        })
        
    try:
        data = fetch_and_parse_feed()
        feed_cache["data"] = data
        feed_cache["last_updated"] = now
        return jsonify({
            "status": "success",
            "source": "network",
            "last_updated": now,
            "data": data
        })
    except Exception as e:
        # If network call fails but we have cached data, return the cached data with an error warning
        if feed_cache["data"] is not None:
            return jsonify({
                "status": "warning",
                "source": "cache_fallback",
                "message": f"Failed to fetch updates, using cached data. Error: {str(e)}",
                "last_updated": feed_cache["last_updated"],
                "data": feed_cache["data"]
            })
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch and parse feed: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Start on standard development port
    app.run(debug=True, host='127.0.0.1', port=5000)
