# Set IMPORT_PATH to the directory where all your images are.  It's OK if they're nested, it'll find all of them and create posts from them.

ENV['IMPORT_PATH'] = "/Users/kplawver/Downloads/lols"

require 'fileutils'

class Importer

  def self.import
    raise "Missing IMPORT_PATH" if ENV["IMPORT_PATH"].nil?

    directory = File.join(ENV['IMPORT_PATH'], "**", "*.{jpg,jpeg,gif,png}")

    entries = Dir.glob(directory)

    importer = self.new

    entries.each do |path|
      importer.create_post(path)
      importer.copy_image(path)
    end

  end

  def create_post(path)
    filename = File.basename(path, ".*")
    post_path = "content/posts/#{filename}"
    if !File.exists?(post_path)
      `hugo new posts/#{filename}/index.md`
    end
  end

  def copy_image(path)
    filename = File.basename(path, ".*")
    FileUtils.copy(path, "content/posts/#{filename}")
  end

end

Importer.import
