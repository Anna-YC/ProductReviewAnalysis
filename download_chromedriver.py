#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ChromeDriver手动下载脚本

使用国内镜像解决网络问题
"""
import os
import sys
import zipfile
from pathlib import Path
import urllib.request


def get_chrome_version():
    """尝试获取Chrome版本"""
    try:
        import subprocess
        result = subprocess.run(
            ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--version'],
            capture_output=True,
            text=True
        )
        version_str = result.stdout
        # 格式: "Google Chrome 131.0.6778.86"
        major_version = version_str.split()[2].split('.')[0]
        return major_version
    except:
        return None


def download_chromedriver(version=None):
    """
    使用淘宝镜像下载ChromeDriver

    Args:
        version: Chrome版本号（如"131"），None则自动检测
    """
    print("=" * 70)
    print("  📥 ChromeDriver下载助手")
    print("=" * 70)
    print()

    # 检测Chrome版本
    if version is None:
        print("正在检测Chrome版本...")
        version = get_chrome_version()
        if version:
            print(f"✓ 检测到Chrome版本: {version}")
        else:
            print("⚠️  无法自动检测，请手动输入版本号")
            version = input("Chrome主版本号(如131): ").strip()
            if not version:
                print("❌ 未提供版本号")
                return False
        print()

    # 使用淘宝镜像
    base_url = "https://registry.npmmirror.com/-/binary/chromedriver/"
    if sys.platform == 'darwin':
        filename = f"chromedriver_mac64_{version}.0.6778.86.zip"
    elif sys.platform.startswith('linux'):
        filename = f"chromedriver_linux64_{version}.0.6778.86.zip"
    elif sys.platform == 'win32':
        filename = f"chromedriver_win32_{version}.0.6778.86.zip"
    else:
        print(f"❌ 不支持的系统: {sys.platform}")
        return False

    download_url = base_url + filename

    print(f"下载地址: {download_url}")
    print()

    # 下载目录
    output_dir = Path.home() / '.wdm' / 'drivers'
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename

    print(f"保存位置: {output_path}")
    print()
    print("⏳ 开始下载...")

    try:
        # 显示进度
        def show_progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            percent = int(downloaded * 100 / total_size)
            sys.stdout.write(f"\r进度: {percent}% ({downloaded/1024/1024:.1f}MB/{total_size/1024/1024:.1f}MB)")
            sys.stdout.flush()

        urllib.request.urlretrieve(download_url, output_path, show_progress)

        print()
        print("✅ 下载完成!")
        print()

        # 解压
        print("⏳ 正在解压...")
        with zipfile.ZipFile(output_path) as zip_ref:
            zip_ref.extractall(output_dir)

        print("✅ 解压完成!")

        # 查找解压后的chromedriver
        extracted_driver = None
        for file in output_dir.iterdir():
            if 'chromedriver' in file.name and not file.name.endswith('.zip'):
                extracted_driver = file
                break

        if extracted_driver:
            print(f"✓ ChromeDriver位置: {extracted_driver}")

            # 复制到/usr/local/bin
            bin_dir = Path('/usr/local/bin')
            if bin_dir.exists():
                target = bin_dir / 'chromedriver'
                import shutil
                shutil.copy(str(extracted_driver), str(target))
                print(f"✓ 已复制到: {target}")

                # 添加执行权限
                os.chmod(str(target), 0o755)
                print("✓ 已添加执行权限")
                print()
                print("=" * 70)
                print("  ✅ ChromeDriver安装完成!")
                print("=" * 70)
                print()
                print("现在可以运行登录版爬虫了:")
                print("  python run_crawler_with_login.py <产品URL>")
                return True

    except Exception as e:
        print()
        print(f"❌ 下载失败: {str(e)}")
        print()
        print("备选方案:")
        print("  1. 访问: https://chromedriver.chromium.org/downloads")
        print("  2. 手动下载后放到 /usr/local/bin/")
        return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ChromeDriver下载助手")
    parser.add_argument("--version", "-v", help="Chrome版本号（如131）")
    args = parser.parse_args()

    try:
        if download_chromedriver(args.version):
            sys.exit(0)
        else:
            sys.exit(1)
    except KeyboardInterrupt:
        print()
        print()
        print("⚠️  用户中断")
        sys.exit(1)
